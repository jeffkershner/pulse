import asyncio
import json
import logging
import time
from collections import deque

import httpx
import websockets

from app.config import settings

logger = logging.getLogger(__name__)

DEFAULT_SYMBOLS = [
    # Index ETFs
    "DIA", "SPY", "QQQ", "IWM",
    # NYSE
    "JPM", "GS", "V", "JNJ", "WMT",
    # NASDAQ
    "AAPL", "MSFT", "GOOGL", "AMZN", "META",
    # S&P 500
    "TSLA", "NVDA", "BRK.B", "UNH", "XOM",
]

SPARKLINE_INTERVAL = 60  # seconds between sparkline data points

quote_cache: dict[str, dict] = {}
sparkline_cache: dict[str, deque] = {}
_sparkline_last_sample: dict[str, float] = {}
_subscribed_symbols: set[str] = set()
_ws = None
_task: asyncio.Task | None = None
_running = False


def get_quote(symbol: str) -> dict | None:
    return quote_cache.get(symbol)


def get_sparkline(symbol: str) -> list[float]:
    if symbol in sparkline_cache:
        return list(sparkline_cache[symbol])
    return []


def get_all_quotes() -> dict[str, dict]:
    return dict(quote_cache)


async def subscribe(symbol: str):
    global _ws
    already_subscribed = symbol in _subscribed_symbols
    _subscribed_symbols.add(symbol)
    if _ws:
        try:
            await _ws.send(json.dumps({"type": "subscribe", "symbol": symbol}))
            logger.info(f"Subscribed to {symbol}")
        except Exception:
            pass
    # Seed cache via REST so the symbol has data immediately
    if not already_subscribed and symbol not in quote_cache:
        await _seed_symbol_from_rest(symbol)


async def unsubscribe(symbol: str):
    global _ws
    _subscribed_symbols.discard(symbol)
    if _ws:
        try:
            await _ws.send(json.dumps({"type": "unsubscribe", "symbol": symbol}))
        except Exception:
            pass


async def _connect_and_consume():
    global _ws, _running

    if not settings.finnhub_api_key or settings.finnhub_api_key == "your_finnhub_api_key_here":
        logger.warning("No Finnhub API key configured, running with simulated data")
        await _run_simulated()
        return

    url = f"wss://ws.finnhub.io?token={settings.finnhub_api_key}"
    backoff = 1

    while _running:
        try:
            async with websockets.connect(url) as ws:
                _ws = ws
                backoff = 1
                logger.info("Connected to Finnhub WebSocket")

                for symbol in _subscribed_symbols:
                    await ws.send(json.dumps({"type": "subscribe", "symbol": symbol}))

                async for message in ws:
                    if not _running:
                        break
                    try:
                        data = json.loads(message)
                        if data.get("type") == "trade" and data.get("data"):
                            for trade in data["data"]:
                                symbol = trade["s"]
                                price = trade["p"]
                                volume = trade.get("v", 0)
                                timestamp = trade.get("t", int(time.time() * 1000))

                                quote_cache[symbol] = {
                                    "symbol": symbol,
                                    "price": price,
                                    "volume": volume,
                                    "timestamp": timestamp,
                                }

                                now = time.time()
                                if symbol not in sparkline_cache:
                                    sparkline_cache[symbol] = deque(maxlen=20)
                                    sparkline_cache[symbol].append(price)
                                    _sparkline_last_sample[symbol] = now
                                elif now - _sparkline_last_sample.get(symbol, 0) >= SPARKLINE_INTERVAL:
                                    sparkline_cache[symbol].append(price)
                                    _sparkline_last_sample[symbol] = now
                                elif sparkline_cache[symbol]:
                                    sparkline_cache[symbol][-1] = price
                    except (json.JSONDecodeError, KeyError) as e:
                        logger.debug(f"Error processing message: {e}")

        except Exception as e:
            _ws = None
            if _running:
                logger.warning(f"Finnhub WS disconnected: {e}. Reconnecting in {backoff}s...")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30)


async def _run_simulated():
    """Generate simulated price data when no API key is available."""
    import random

    base_prices = {
        "DIA": 420.0, "SPY": 530.0, "QQQ": 460.0, "IWM": 220.0,
        "JPM": 195.0, "GS": 480.0, "V": 280.0, "JNJ": 155.0, "WMT": 170.0,
        "AAPL": 190.0, "MSFT": 420.0, "GOOGL": 175.0, "AMZN": 185.0, "META": 510.0,
        "TSLA": 250.0, "NVDA": 800.0, "BRK.B": 410.0, "UNH": 520.0, "XOM": 105.0,
    }

    # Initialize caches
    for symbol in _subscribed_symbols:
        base = base_prices.get(symbol, 100.0)
        quote_cache[symbol] = {
            "symbol": symbol,
            "price": base,
            "volume": random.randint(100000, 5000000),
            "timestamp": int(time.time() * 1000),
        }
        sparkline_cache[symbol] = deque(maxlen=20)
        walk_price = base
        for i in range(20):
            walk_price = round(walk_price * (1 + random.uniform(-0.002, 0.002)), 2)
            sparkline_cache[symbol].append(walk_price)
        _sparkline_last_sample[symbol] = time.time()

    while _running:
        await asyncio.sleep(1.5)
        for symbol in list(_subscribed_symbols):
            if symbol in quote_cache:
                prev = quote_cache[symbol]["price"]
                change = prev * random.uniform(-0.003, 0.003)
                new_price = round(prev + change, 2)

                quote_cache[symbol] = {
                    "symbol": symbol,
                    "price": new_price,
                    "volume": quote_cache[symbol]["volume"] + random.randint(100, 5000),
                    "timestamp": int(time.time() * 1000),
                }

                now = time.time()
                if symbol not in sparkline_cache:
                    sparkline_cache[symbol] = deque(maxlen=20)
                    sparkline_cache[symbol].append(new_price)
                    _sparkline_last_sample[symbol] = now
                elif now - _sparkline_last_sample.get(symbol, 0) >= SPARKLINE_INTERVAL:
                    sparkline_cache[symbol].append(new_price)
                    _sparkline_last_sample[symbol] = now
                elif sparkline_cache[symbol]:
                    sparkline_cache[symbol][-1] = new_price


async def _seed_symbol_from_rest(symbol: str):
    """Fetch a single symbol's quote via REST API to seed the cache."""
    if not settings.finnhub_api_key or settings.finnhub_api_key == "your_finnhub_api_key_here":
        return
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://finnhub.io/api/v1/quote",
                params={"symbol": symbol, "token": settings.finnhub_api_key},
                timeout=5,
            )
            if resp.status_code == 200:
                data = resp.json()
                price = data.get("c", 0)
                prev_close = data.get("pc", 0)
                if price > 0:
                    quote_cache[symbol] = {
                        "symbol": symbol,
                        "price": price,
                        "volume": data.get("v", 0) or 0,
                        "timestamp": data.get("t", int(time.time())) * 1000,
                    }
                    if symbol not in sparkline_cache:
                        sparkline_cache[symbol] = deque(maxlen=20)
                    if prev_close > 0:
                        sparkline_cache[symbol].append(prev_close)
                    sparkline_cache[symbol].append(price)
                    _sparkline_last_sample[symbol] = time.time()
                    logger.debug(f"Seeded {symbol} @ {price} (pc={prev_close})")
    except Exception as e:
        logger.debug(f"Failed to seed {symbol}: {e}")


async def _seed_cache_from_rest():
    """Fetch initial quotes via REST API so the cache isn't empty before WS trades arrive."""
    if not settings.finnhub_api_key or settings.finnhub_api_key == "your_finnhub_api_key_here":
        return

    for symbol in list(_subscribed_symbols):
        await _seed_symbol_from_rest(symbol)
        await asyncio.sleep(0.1)  # respect rate limits (60/min)

    logger.info(f"Seeded cache with {len(quote_cache)} symbols via REST API")


async def start():
    global _task, _running
    _running = True
    for symbol in DEFAULT_SYMBOLS:
        _subscribed_symbols.add(symbol)
    # Seed cache in background so it doesn't block server startup
    asyncio.create_task(_seed_cache_from_rest())
    _task = asyncio.create_task(_connect_and_consume())
    logger.info(f"Finnhub service started with {len(_subscribed_symbols)} symbols")


async def stop():
    global _task, _running, _ws
    _running = False
    if _ws:
        await _ws.close()
        _ws = None
    if _task:
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
        _task = None
    logger.info("Finnhub service stopped")
