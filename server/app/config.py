from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://pulse:pulse@db:5432/pulse"
    finnhub_api_key: str = ""
    jwt_secret: str = "change-me-to-a-random-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    resend_api_key: str = ""
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    starting_balance: float = 100000.00

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
