from pydantic import BaseModel, Field


class TradeRequest(BaseModel):
    symbol: str
    side: str = Field(..., pattern="^(BUY|SELL)$")
    quantity: int = Field(..., gt=0)


class TradeResponse(BaseModel):
    id: str
    symbol: str
    side: str
    quantity: int
    price: float
    total: float
    executed_at: str


class TradeHistoryResponse(BaseModel):
    trades: list[TradeResponse]
    total: int
    page: int
    page_size: int
