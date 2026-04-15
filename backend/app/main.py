from contextlib import asynccontextmanager
import logging
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.logging_config import setup_logging

setup_logging()

from app.api.v2 import auth as auth_v2
from app.api.v2 import comments as comments_v2
from app.api.v2 import lenses as lenses_v2
from app.api.v2 import posts as posts_v2
from app.api.v2 import proposals as proposals_v2
from app.config import settings
from app.rate_limit import limiter
from app.services.embedding_service import get_model

logger = logging.getLogger(__name__)
APP_VERSION = "0.2.0"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Podstawowe nagłówki zmniejszające ryzyko clickjacking i MIME sniffing."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Wykonuje się przy starcie i zamknięciu aplikacji."""

    # ── STARTUP ──
    logger.info("ZebraPoint API — uruchamianie...")
    if settings.load_embeddings_on_startup:
        logger.info("Ładowanie modelu embeddingów (może potrwać do 30s)...")
        get_model()
        logger.info("Model embeddingów załadowany.")
    else:
        logger.info("Model embeddingów będzie ładowany leniwie (przy pierwszym użyciu).")
    logger.info("Aplikacja gotowa!")

    yield

    # ── SHUTDOWN ──
    logger.info("Zamykanie aplikacji...")


app = FastAPI(
    title="ZebraPoint API",
    description="API dla platformy wsparcia opiekunów osób z rzadkimi chorobami",
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SlowAPIMiddleware)


class DevCorsFallbackMiddleware(BaseHTTPMiddleware):
    """W development dopina Access-Control-Allow-Origin, gdy odpowiedź go nie ma (np. niektóre ścieżki błędów)."""

    _exact = frozenset(
        {
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        }
    )
    _pattern = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$")

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if settings.environment.lower() != "development":
            return response
        if response.headers.get("access-control-allow-origin"):
            return response
        origin = request.headers.get("origin")
        if not origin:
            return response
        if origin in self._exact or self._pattern.match(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response


_cors_origins = (
    [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    if settings.environment.lower() == "development"
    else [
        o.strip()
        for o in (settings.frontend_origins or "").split(",")
        if o.strip()
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=(
        r"^http://(localhost|127\.0\.0\.1)(:\d+)?$"
        if settings.environment.lower() == "development"
        else None
    ),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Authorization", "X-Requested-With"],
)

app.add_middleware(DevCorsFallbackMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth_v2.router)
app.include_router(comments_v2.router)
app.include_router(lenses_v2.router)
app.include_router(posts_v2.router)
app.include_router(proposals_v2.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "ZebraPoint API", "version": APP_VERSION}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
