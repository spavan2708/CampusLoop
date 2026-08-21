import io
from pathlib import Path
from secrets import token_urlsafe
from typing import Protocol

from .config import get_settings

import cloudinary
import cloudinary.uploader
from PIL import Image

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


ALLOWED_PILLOW_FORMATS = {"JPEG", "PNG", "WEBP"}


def _validate_image_bytes(content: bytes, content_type: str = None) -> None:
    """Validate that content is a valid image with an allowed format using Pillow; raise if not."""
    if not content:
        raise ValueError("Image must be between 1 byte and 5 MB")
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
        if img.format not in ALLOWED_PILLOW_FORMATS:
            raise ValueError(
                f"Image format '{img.format}' is not allowed. Only JPEG, PNG, and WebP are accepted."
            )
        # Verify the decoded format matches the supplied content_type
        format_map = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}
        if content_type and img.format != format_map.get(content_type):
            raise ValueError(
                f"Image format '{img.format}' does not match content type '{content_type}'."
            )
    except Exception as exc:
        raise ValueError("Uploaded content is not a valid image") from exc


class StorageService(Protocol):
    """Interface for local development and future durable object storage."""

    def save_image(self, content: bytes, content_type: str) -> str: ...


class LocalStorageService:
    """Development storage; local filesystem for debugging."""

    def save_image(self, content: bytes, content_type: str) -> str:
        _validate_image_bytes(content, content_type)
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise ValueError("Only JPEG, PNG, and WebP images are accepted")
        if len(content) > MAX_IMAGE_BYTES:
            raise ValueError("Image must be between 1 byte and 5 MB")
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"{token_urlsafe(24)}{ALLOWED_IMAGE_TYPES[content_type]}"
        (UPLOAD_DIR / filename).write_bytes(content)
        return f"/uploads/{filename}"


class CloudinaryStorageService:
    """Production storage; uploads to Cloudinary."""

    def save_image(self, content: bytes, content_type: str) -> str:
        _validate_image_bytes(content, content_type)
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise ValueError("Only JPEG, PNG, and WebP images are accepted")
        if len(content) > MAX_IMAGE_BYTES:
            raise ValueError("Image must be between 1 byte and 5 MB")

        settings = get_settings()
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret.get_secret_value(),
        )

        ext = ALLOWED_IMAGE_TYPES[content_type]
        result = cloudinary.uploader.upload(
            io.BytesIO(content),
            folder="campusloop",
            format=ext.lstrip("."),
        )
        return result["secure_url"]


storage: StorageService = LocalStorageService() if not get_settings().is_production else CloudinaryStorageService()
