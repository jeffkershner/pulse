from pydantic import BaseModel


class WatchlistAddRequest(BaseModel):
    symbol: str


class WatchlistItem(BaseModel):
    symbol: str
    added_at: str

    model_config = {"from_attributes": True}


class WatchlistResponse(BaseModel):
    items: list[WatchlistItem]
