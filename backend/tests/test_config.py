import pytest
from pydantic import ValidationError

from app.config import DEFAULT_DATABASE_URL, Settings


PRODUCTION_SECRET = "production-test-secret-that-is-long-and-random-enough"
PRODUCTION_ORIGINS = (
    "https://students.example.edu,"
    "https://clubs.example.edu,"
    "https://admin.example.edu"
)
# Safe fake Cloudinary credentials for testing — never real values
PRODUCTION_CLOUDINARY_CLOUD_NAME = "test-cloud-name"
PRODUCTION_CLOUDINARY_API_KEY = "test-api-key"
PRODUCTION_CLOUDINARY_API_SECRET = "test-api-secret"


def production_settings(**overrides):
    values = {
        "environment": "production",
        "database_url": "postgresql+psycopg://user:password@db.example.edu/campusloop",
        "jwt_secret": PRODUCTION_SECRET,
        "allowed_frontend_origin": PRODUCTION_ORIGINS,
        "cloudinary_cloud_name": PRODUCTION_CLOUDINARY_CLOUD_NAME,
        "cloudinary_api_key": PRODUCTION_CLOUDINARY_API_KEY,
        "cloudinary_api_secret": PRODUCTION_CLOUDINARY_API_SECRET,
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_local_defaults_use_backend_sqlite():
    settings = Settings(
        _env_file=None,
        environment="development",
        database_url=DEFAULT_DATABASE_URL,
        jwt_secret="development-only-placeholder",
        allowed_frontend_origin="http://localhost:5173",
    )
    assert settings.environment == "development"
    assert settings.database_url == DEFAULT_DATABASE_URL
    assert settings.is_sqlite is True


def test_render_style_postgres_url_is_normalized_for_psycopg3():
    settings = production_settings(
        database_url="postgres://user:password@db.example.edu/campusloop"
    )
    assert settings.database_url.startswith("postgresql+psycopg://")


def test_production_requires_database_url():
    with pytest.raises(ValidationError, match="DATABASE_URL is required"):
        production_settings(database_url=DEFAULT_DATABASE_URL)


def test_production_rejects_sqlite():
    with pytest.raises(ValidationError, match="SQLite DATABASE_URL is not allowed"):
        production_settings(database_url="sqlite:////tmp/production.db")


@pytest.mark.parametrize(
    "secret",
    ["", "development-only-placeholder", "replace-with-a-private-random-value"],
)
def test_production_rejects_missing_or_development_jwt_secret(secret):
    with pytest.raises(ValidationError, match="non-development JWT_SECRET"):
        production_settings(jwt_secret=secret)


def test_cors_origins_are_trimmed_and_wildcards_are_rejected():
    settings = production_settings()
    assert settings.allowed_frontend_origins == [
        "https://students.example.edu",
        "https://clubs.example.edu",
        "https://admin.example.edu",
    ]
    with pytest.raises(ValidationError, match="Wildcard CORS origins"):
        production_settings(allowed_frontend_origin="*")


def test_production_requires_cloudinary_credentials():
    """Production Settings must have all three Cloudinary credentials."""
    values = {
        "environment": "production",
        "database_url": "postgresql+psycopg://user:password@db.example.edu/campusloop",
        "jwt_secret": PRODUCTION_SECRET,
        "allowed_frontend_origin": PRODUCTION_ORIGINS,
    }
    with pytest.raises(ValidationError, match="Cloudinary credentials"):
        Settings(_env_file=None, **values)


def test_production_accepts_cloudinary_credentials():
    """Production Settings accepts complete fake Cloudinary credentials."""
    settings = production_settings()
    assert settings.cloudinary_configured is True


def test_development_does_not_require_cloudinary_credentials():
    """Development Settings does not require Cloudinary credentials."""
    settings = Settings(
        _env_file=None,
        environment="development",
        database_url="sqlite:////Users/pavans/CampusLoop/backend/campusloop.db",
        jwt_secret="development-only-placeholder",
        allowed_frontend_origin="http://localhost:5173",
    )
    assert settings.environment == "development"
    assert settings.is_sqlite is True
    assert settings.cloudinary_configured is False
