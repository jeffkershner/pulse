from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.position import Position
from app.models.user import User
from app.schemas.portfolio import PortfolioResponse, PortfolioSummary, PositionResponse
from app.services import finnhub_service


async def get_portfolio(db: AsyncSession, user: User) -> PortfolioResponse:
    result = await db.execute(
        select(Position).where(Position.user_id == user.id, Position.quantity > 0)
    )
    positions = result.scalars().all()

    position_responses = []
    total_invested = 0.0
    total_market_value = 0.0
    total_unrealized = 0.0

    for pos in positions:
        quote = finnhub_service.get_quote(pos.symbol)
        current_price = quote["price"] if quote else pos.avg_cost_basis
        market_value = round(current_price * pos.quantity, 2)
        unrealized = round((current_price - pos.avg_cost_basis) * pos.quantity, 2)
        unrealized_pct = round((unrealized / pos.total_cost) * 100, 2) if pos.total_cost else 0.0

        total_invested += pos.total_cost
        total_market_value += market_value
        total_unrealized += unrealized

        position_responses.append(PositionResponse(
            symbol=pos.symbol,
            quantity=pos.quantity,
            avg_cost_basis=round(pos.avg_cost_basis, 2),
            total_cost=round(pos.total_cost, 2),
            current_price=round(current_price, 2),
            market_value=market_value,
            unrealized_pnl=unrealized,
            unrealized_pnl_percent=unrealized_pct,
            realized_pnl=round(pos.realized_pnl, 2),
        ))

    total_value = round(user.cash_balance + total_market_value, 2)
    total_return = round(total_value - user.starting_balance, 2)
    total_return_pct = round((total_return / user.starting_balance) * 100, 2) if user.starting_balance else 0.0

    return PortfolioResponse(
        summary=PortfolioSummary(
            total_value=total_value,
            cash_balance=round(user.cash_balance, 2),
            invested_value=round(total_market_value, 2),
            total_return=total_return,
            total_return_percent=total_return_pct,
        ),
        positions=position_responses,
    )
