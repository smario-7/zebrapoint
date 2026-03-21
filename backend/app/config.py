import sys
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_DIR / ".env"),
        case_sensitive=False,
    )
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    environment: str = "development"
    debug: bool = True
    redis_url: str = "redis://redis:6379/0"
    frontend_origins: str = ""
    load_embeddings_on_startup: bool = False
    openai_api_key: str = ""
    log_dir: str = ""

    def resolved_log_dir(self) -> Path:
        fallback = _BACKEND_DIR.parent / "logs"
        if not self.log_dir.strip():
            fallback.mkdir(parents=True, exist_ok=True)
            return fallback
        primary = Path(self.log_dir).expanduser().resolve()
        try:
            primary.mkdir(parents=True, exist_ok=True)
            return primary
        except PermissionError:
            fallback.mkdir(parents=True, exist_ok=True)
            sys.stderr.write(
                f"Uwaga: LOG_DIR={self.log_dir!r} niedostępny (brak uprawnień) — używam {fallback}\n"
            )
            return fallback


settings = Settings()
