from pathlib import Path

from pydantic_settings import BaseSettings

_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    environment: str = "development"
    debug: bool = True

    class Config:
        env_file = _BACKEND_DIR / ".env"
        case_sensitive = False


settings = Settings()
