from pydantic import BaseModel


class PositionResponse(BaseModel):
    symbol: str
    quantity: int
    avg_cost_basis: float
    total_cost: float
    current_price: float
    market_value: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    realized_pnl: float


class PortfolioSummary(BaseModel):
    total_value: float
    cash_balance: float
    invested_value: float
    total_return: float
    total_return_percent: float


class PortfolioResponse(BaseModel):
    summary: PortfolioSummary
    positions: list[PositionResponse]
