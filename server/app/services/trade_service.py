from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.position import Position
from app.models.trade import Trade
from app.models.user import User
from app.services import finnhub_service


async def execute_trade(db: AsyncSession, user: User, symbol: str, side: str, quantity: int) -> Trade:
    quote = finnhub_service.get_quote(symbol.upper())
    if not quote:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"No price data for {symbol}")

    price = quote["price"]
    total = round(price * quantity, 2)
    symbol = symbol.upper()

    # Get or create position
    result = await db.execute(
        select(Position).where(Position.user_id == user.id, Position.symbol == symbol)
    )
    position = result.scalar_one_or_none()

    if side == "BUY":
        if user.cash_balance < total:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient cash. Need ${total:.2f}, have ${user.cash_balance:.2f}",
            )

        user.cash_balance = round(user.cash_balance - total, 2)

        if position:
            new_total_cost = position.total_cost + total
            new_quantity = position.quantity + quantity
            position.avg_cost_basis = round(new_total_cost / new_quantity, 4)
            position.total_cost = round(new_total_cost, 2)
            position.quantity = new_quantity
        else:
            position = Position(
                user_id=user.id,
                symbol=symbol,
                quantity=quantity,
                avg_cost_basis=price,
                total_cost=total,
                realized_pnl=0.0,
            )
            db.add(position)

    elif side == "SELL":
        if not position or position.quantity < quantity:
            available = position.quantity if position else 0
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient shares. Have {available}, trying to sell {quantity}",
            )

        realized = round((price - position.avg_cost_basis) * quantity, 2)
        position.realized_pnl = round(position.realized_pnl + realized, 2)
        position.quantity -= quantity
        position.total_cost = round(position.avg_cost_basis * position.quantity, 2)

        user.cash_balance = round(user.cash_balance + total, 2)

    trade = Trade(
        user_id=user.id,
        symbol=symbol,
        side=side,
        quantity=quantity,
        price=price,
        total=total,
    )
    db.add(trade)
    await db.commit()
    await db.refresh(trade)
    return trade
