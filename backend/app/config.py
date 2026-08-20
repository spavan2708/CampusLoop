from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATABASE_URL = f"sqlite:///{(BACKEND_DIR / 'campusloop.db').as_posix()}"
DEVELOPMENT_JWT_SECRETS = {
    "development-only-placeholder",
    "change-me",
    "replace-me",
    "replace-with-a-private-random-value",
}


class Settings(BaseSettings):
    environment: Literal["development", "production"] = "development"
    database_url: str = DEFAULT_DATABASE_URL
    jwt_secret: SecretStr = SecretStr("development-only-placeholder")
    jwt_expiry_minutes: int = Field(default=60, gt=0)
    allowed_frontend_origin: str = "http://localhost:5173"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        url = value.strip()
        if url.startswith("postgres://"):
            return f"postgresql+psycopg://{url.removeprefix('postgres://')}"
        if url.startswith("postgresql://"):
            return f"postgresql+psycopg://{url.removeprefix('postgresql://')}"
        return url

    @model_validator(mode="after")
    def validate_environment_safety(self) -> "Settings":
        origins = self.allowed_frontend_origins
        if not origins:
            raise ValueError("ALLOWED_FRONTEND_ORIGIN must contain at least one origin")
        if "*" in origins:
            raise ValueError("Wildcard CORS origins are not allowed when credentials are enabled")

        if self.environment == "production":
            if not self.database_url or self.database_url == DEFAULT_DATABASE_URL:
                raise ValueError("DATABASE_URL is required in production")
            if self.is_sqlite:
                raise ValueError("SQLite DATABASE_URL is not allowed in production")
            secret = self.jwt_secret.get_secret_value().strip()
            if len(secret) < 32 or secret.lower() in DEVELOPMENT_JWT_SECRETS:
                raise ValueError("A non-development JWT_SECRET is required in production")
        return self

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        return not self.is_production

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite:")

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
