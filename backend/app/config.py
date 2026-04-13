import sys
from pathlib import Path

from pydantic import field_validator
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
    environment: str = "production"
    debug: bool = False
    redis_url: str = "redis://redis:6379/0"
    frontend_origins: str = ""
    load_embeddings_on_startup: bool = False
    openai_api_key: str = ""
    log_dir: str = ""
    access_token_cookie_name: str = "access_token"
    refresh_token_cookie_name: str = "refresh_token"
    cookie_secure: bool = False

    anthropic_api_key: str = ""
    hpo_extraction_enabled: bool = True
    match_score_threshold: float = 0.40
    max_lenses_per_post: int = 10

    redis_cache_url: str = "redis://redis:6379/1"
    redis_auth_url: str = "redis://redis:6379/2"

    @field_validator("secret_key")
    @classmethod
    def secret_key_min_length(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY musi mieć co najmniej 32 znaki")
        return v

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

    def cookie_secure_flag(self) -> bool:
        """Secure=True wymaga HTTPS; w development zwykle False."""
        if self.cookie_secure:
            return True
        return self.environment.lower() == "production"


settings = Settings()
