from pydantic import BaseModel


class IndexQuote(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float


class QuoteSnapshot(BaseModel):
    symbol: str
    price: float
    volume: int = 0
    timestamp: int = 0
    sparkline: list[float] = []


class SymbolSearchResult(BaseModel):
    symbol: str
    description: str
    type: str


class MarketStatus(BaseModel):
    is_open: bool
    holiday: str | None = None
