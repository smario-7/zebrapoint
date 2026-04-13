import logging
import socket
from collections.abc import AsyncGenerator
from urllib.parse import urlparse, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)


def _database_url_with_ipv4(url: str) -> str:
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc
        if not netloc or "@" not in netloc:
            return url
        credentials, _, hostport = netloc.rpartition("@")
        if ":" not in hostport:
            return url
        host, _, port = hostport.rpartition(":")
        ipv4 = socket.gethostbyname(host)
        new_netloc = f"{credentials}@{ipv4}:{port}"
        result = urlunparse(parsed._replace(netloc=new_netloc))
        if settings.debug:
            logger.debug("Database host %s resolved to IPv4 %s", host, ipv4)
        return result
    except (socket.gaierror, OSError):
        if settings.debug:
            logger.debug(
                "IPv4 resolution failed for database host; using original URL. "
                "If you see 'Network is unreachable', use Session mode connection string from Supabase Dashboard (pooler host)."
            )
        return url


def _to_asyncpg_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql+psycopg2://"):
        return "postgresql+asyncpg://" + url[len("postgresql+psycopg2://") :]
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://") :]
    return url


database_url = _to_asyncpg_url(_database_url_with_ipv4(settings.database_url))

async_engine = create_async_engine(
    database_url,
    pool_pre_ping=True,
    echo=settings.debug,
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
