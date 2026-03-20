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


settings = Settings()
