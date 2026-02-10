from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.trade import Trade
from app.models.user import User
from app.schemas.trade import TradeHistoryResponse, TradeRequest, TradeResponse
from app.services.trade_service import execute_trade

router = APIRouter(prefix="/trades", tags=["trades"])


@router.post("", response_model=TradeResponse)
async def create_trade(
    req: TradeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trade = await execute_trade(db, user, req.symbol, req.side, req.quantity)
    return TradeResponse(
        id=str(trade.id),
        symbol=trade.symbol,
        side=trade.side,
        quantity=trade.quantity,
        price=trade.price,
        total=trade.total,
        executed_at=str(trade.executed_at),
    )


@router.get("", response_model=TradeHistoryResponse)
async def get_trade_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count_result = await db.execute(
        select(func.count()).select_from(Trade).where(Trade.user_id == user.id)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(Trade)
        .where(Trade.user_id == user.id)
        .order_by(Trade.executed_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    trades = result.scalars().all()

    return TradeHistoryResponse(
        trades=[
            TradeResponse(
                id=str(t.id),
                symbol=t.symbol,
                side=t.side,
                quantity=t.quantity,
                price=t.price,
                total=t.total,
                executed_at=str(t.executed_at),
            )
            for t in trades
        ],
        total=total,
        page=page,
        page_size=page_size,
    )
