from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.watchlist import Watchlist
from app.schemas.watchlist import WatchlistAddRequest, WatchlistItem, WatchlistResponse
from app.services import finnhub_service

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("", response_model=WatchlistResponse)
async def get_watchlist(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Watchlist).where(Watchlist.user_id == user.id).order_by(Watchlist.added_at.desc())
    )
    items = result.scalars().all()
    return WatchlistResponse(
        items=[WatchlistItem(symbol=w.symbol, added_at=str(w.added_at)) for w in items]
    )


@router.post("", response_model=WatchlistItem, status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    req: WatchlistAddRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    symbol = req.symbol.upper()

    existing = await db.execute(
        select(Watchlist).where(Watchlist.user_id == user.id, Watchlist.symbol == symbol)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Symbol already in watchlist")

    entry = Watchlist(user_id=user.id, symbol=symbol)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    await finnhub_service.subscribe(symbol)

    return WatchlistItem(symbol=entry.symbol, added_at=str(entry.added_at))


@router.delete("/{symbol}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(
    symbol: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    symbol = symbol.upper()
    result = await db.execute(
        delete(Watchlist).where(Watchlist.user_id == user.id, Watchlist.symbol == symbol)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Symbol not in watchlist")
    await db.commit()
