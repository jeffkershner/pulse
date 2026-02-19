import asyncio
import json
import logging

import httpx
from fastapi import APIRouter, Depends, Query, Request
from sse_starlette.sse import EventSourceResponse

from app.config import settings
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.market import IndexQuote, MarketStatus, QuoteSnapshot, SymbolSearchResult
from app.services import finnhub_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["market"])

# ETF tickers used as proxies for major indices, with scaling factors to
# convert ETF prices to approximate index values.
# DIA ≈ DJIA / 100, SPY ≈ S&P 500 / 10 (by ETF design, very stable).
# QQQ and IWM ratios drift over time; these are approximate as of early 2026.
INDEX_MAP = {
    "DIA":  {"name": "DOW 30",      "factor": 100},
    "SPY":  {"name": "S&P 500",     "factor": 10},
    "QQQ":  {"name": "NASDAQ 100",  "factor": 34},
    "IWM":  {"name": "Russell 2000", "factor": 8.7},
}


@router.get("/market/indices", response_model=list[IndexQuote])
async def get_indices():
    results = []
    for symbol, info in INDEX_MAP.items():
        name = info["name"]
        factor = info["factor"]
        quote = finnhub_service.get_quote(symbol)
        if quote:
            sparkline = finnhub_service.get_sparkline(symbol)
            prev = sparkline[0] if len(sparkline) > 1 else quote["price"]
            price = quote["price"] * factor
            prev_scaled = prev * factor
            change = price - prev_scaled
            change_pct = (change / prev_scaled * 100) if prev_scaled else 0
            results.append(IndexQuote(
                symbol=symbol,
                name=name,
                price=round(price, 2),
                change=round(change, 2),
                change_percent=round(change_pct, 2),
            ))
        else:
            # Try Finnhub REST as fallback
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        "https://finnhub.io/api/v1/quote",
                        params={"symbol": symbol, "token": settings.finnhub_api_key},
                        timeout=5,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        price = data.get("c", 0) * factor
                        results.append(IndexQuote(
                            symbol=symbol,
                            name=name,
                            price=round(price, 2),
                            change=round(data.get("d", 0) * factor, 2),
                            change_percent=round(data.get("dp", 0), 2),
                        ))
            except Exception as e:
                logger.debug(f"Failed to fetch index {symbol}: {e}")
    return results


@router.get("/market/status", response_model=MarketStatus)
async def get_market_status():
    if not settings.finnhub_api_key or settings.finnhub_api_key == "your_finnhub_api_key_here":
        # Fallback: naive weekday + time check in ET
        from datetime import datetime
        from zoneinfo import ZoneInfo
        now = datetime.now(ZoneInfo("America/New_York"))
        day = now.weekday()  # 0=Mon, 6=Sun
        if day >= 5:
            return MarketStatus(is_open=False)
        total_mins = now.hour * 60 + now.minute
        return MarketStatus(is_open=570 <= total_mins < 960)
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://finnhub.io/api/v1/stock/market-status",
                params={"exchange": "US", "token": settings.finnhub_api_key},
                timeout=5,
            )
            if resp.status_code == 200:
                data = resp.json()
                return MarketStatus(
                    is_open=data.get("isOpen", False),
                    holiday=data.get("holiday") or None,
                )
    except Exception as e:
        logger.error(f"Market status check failed: {e}")
    return MarketStatus(is_open=False)


@router.get("/quotes/latest", response_model=list[QuoteSnapshot])
async def get_latest_quotes(symbols: str = Query(...)):
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    results = []
    for symbol in symbol_list:
        quote = finnhub_service.get_quote(symbol)
        sparkline = finnhub_service.get_sparkline(symbol)
        if quote:
            results.append(QuoteSnapshot(
                symbol=symbol,
                price=quote["price"],
                volume=quote.get("volume", 0),
                timestamp=quote.get("timestamp", 0),
                sparkline=sparkline,
            ))
    return results


@router.get("/search", response_model=list[SymbolSearchResult])
async def search_symbols(
    q: str = Query(..., min_length=1),
    _user: User = Depends(get_current_user),
):
    if not settings.finnhub_api_key or settings.finnhub_api_key == "your_finnhub_api_key_here":
        return []
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://finnhub.io/api/v1/search",
                params={"q": q, "token": settings.finnhub_api_key},
                timeout=5,
            )
            if resp.status_code == 200:
                data = resp.json()
                return [
                    SymbolSearchResult(
                        symbol=r["symbol"],
                        description=r.get("description", ""),
                        type=r.get("type", ""),
                    )
                    for r in data.get("result", [])[:10]
                ]
    except Exception as e:
        logger.error(f"Search failed: {e}")
    return []


@router.get("/stream")
async def stream_quotes(
    request: Request,
    symbols: str = Query(...),
    token: str = Query(...),
):
    # Validate token
    from app.services.auth_service import decode_token
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]

    # Auto-subscribe any symbols not already tracked (e.g. watchlist items after restart)
    for sym in symbol_list:
        if not finnhub_service.get_quote(sym):
            await finnhub_service.subscribe(sym)

    async def event_generator():
        # Send initial snapshot
        snapshots = []
        for symbol in symbol_list:
            quote = finnhub_service.get_quote(symbol)
            sparkline = finnhub_service.get_sparkline(symbol)
            if quote:
                snapshots.append({
                    "symbol": symbol,
                    "price": quote["price"],
                    "volume": quote.get("volume", 0),
                    "timestamp": quote.get("timestamp", 0),
                    "sparkline": sparkline,
                })
        yield {"event": "snapshot", "data": json.dumps(snapshots)}

        # Stream updates
        last_prices: dict[str, float] = {}
        heartbeat_counter = 0
        while True:
            if await request.is_disconnected():
                break

            updates = []
            for symbol in symbol_list:
                quote = finnhub_service.get_quote(symbol)
                if quote:
                    price = quote["price"]
                    if last_prices.get(symbol) != price:
                        last_prices[symbol] = price
                        sparkline = finnhub_service.get_sparkline(symbol)
                        updates.append({
                            "symbol": symbol,
                            "price": price,
                            "volume": quote.get("volume", 0),
                            "timestamp": quote.get("timestamp", 0),
                            "sparkline": sparkline,
                        })

            if updates:
                yield {"event": "quote", "data": json.dumps(updates)}
                heartbeat_counter = 0
            else:
                heartbeat_counter += 1
                # Send heartbeat every ~15 seconds (30 iterations * 0.5s)
                if heartbeat_counter >= 30:
                    yield {"event": "heartbeat", "data": ""}
                    heartbeat_counter = 0

            await asyncio.sleep(0.5)

    return EventSourceResponse(event_generator())
