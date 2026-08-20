from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATABASE_URL = f"sqlite:///{(BACKEND_DIR / 'campusloop.db').as_posix()}"


class Settings(BaseSettings):
    database_url: str = DEFAULT_DATABASE_URL
    jwt_secret: SecretStr = SecretStr("development-only-placeholder")
    jwt_expiry_minutes: int = Field(default=60, gt=0)
    allowed_frontend_origin: str = "http://localhost:5173"

    @property
    def allowed_frontend_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_frontend_origin.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
