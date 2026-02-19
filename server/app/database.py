from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# Neon provides postgresql:// URLs — swap to asyncpg driver and enable SSL
_db_url = settings.database_url
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Strip query params that asyncpg doesn't understand (sslmode, channel_binding)
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
_parsed = urlparse(_db_url)
_params = {k: v for k, v in parse_qs(_parsed.query).items() if k not in ("sslmode", "channel_binding")}
_db_url = urlunparse(_parsed._replace(query=urlencode(_params, doseq=True)))

_connect_args = {}
if "neon.tech" in _db_url:
    _connect_args["ssl"] = True

engine = create_async_engine(
    _db_url,
    echo=False,
    connect_args=_connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
