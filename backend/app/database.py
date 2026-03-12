import logging
import socket
from urllib.parse import urlparse, urlunparse

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)


def _database_url_with_ipv4(url: str) -> str:
    """
    Zamienia host w URL bazy na adres IPv4, żeby uniknąć błędów przy braku IPv6.
    Przy braku IPv6 w sieci zaleca się użycie connection stringa Session mode
    z Supabase Dashboard (host aws-0-REGION.pooler.supabase.com) zamiast direct (db.xxx.supabase.co).
    """
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


database_url = _database_url_with_ipv4(settings.database_url)
engine = create_engine(
    database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    echo=settings.debug
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    """Dependency — tworzy sesję DB na czas jednego requestu."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
