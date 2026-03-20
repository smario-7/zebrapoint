from contextlib import asynccontextmanager
import logging
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.config import settings
from app.routers import auth, chat, groups, symptoms, admin, forum, reports, dm, dm_ws, bootstrap
from app.services.embedding_service import get_model

logger = logging.getLogger(__name__)
APP_VERSION = "0.2.0"


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
    redoc_url="/redoc"
)

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
        return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=(
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
    ),
    allow_origin_regex=(
        r"^http://(localhost|127\.0\.0\.1)(:\d+)?$"
        if settings.environment.lower() == "development"
        else None
    ),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(DevCorsFallbackMiddleware)

app.include_router(auth.router)
app.include_router(symptoms.router)
app.include_router(groups.router)
app.include_router(chat.router)
app.include_router(chat.rest_router)
app.include_router(admin.router)
app.include_router(forum.router)
app.include_router(reports.router)
app.include_router(dm.router)
app.include_router(dm_ws.router)
app.include_router(bootstrap.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "ZebraPoint API", "version": APP_VERSION}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
