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

# Cloudinary folder organization
CLOUDINARY_BASE_FOLDER = "campusloop"
CLUB_LOGOS_FOLDER = "clubs/logos"
CLUB_BANNERS_FOLDER = "clubs/banners"
EVENT_POSTERS_FOLDER = "events/posters"
EVENT_BANNERS_FOLDER = "events/banners"

# Deterministic public ID patterns
CLUB_LOG_PUBLIC_ID_PATTERN = "club_{id}"
EVENT_POSTER_PUBLIC_ID_PATTERN = "event_{id}"


# Upload context for replacement cleanup (set by routes before calling save_image)
_upload_context = {
    "entity_type": None,  # "club" or "event"
    "entity_id": None,    # int database ID
}


def set_upload_context(entity_type: str, entity_id: int) -> None:
    """Set the upload context so CloudinaryStorageService can cleanup previous assets."""
    _upload_context["entity_type"] = entity_type
    _upload_context["entity_id"] = entity_id


def clear_upload_context() -> None:
    """Clear the upload context after an upload cycle."""
    _upload_context["entity_type"] = None
    _upload_context["entity_id"] = None


def _generate_public_id(entity_type: str, entity_id: int) -> str:
    """Generate a deterministic public ID for the given entity."""
    if entity_type == "club":
        return CLUB_LOG_PUBLIC_ID_PATTERN.format(id=entity_id)
    if entity_type == "event":
        return EVENT_POSTER_PUBLIC_ID_PATTERN.format(id=entity_id)
    return f"{entity_type}_{entity_id}"


def _delete_previous_asset() -> None:
    """Delete any previous Cloudinary asset belonging to this CampusLoop app."""
    entity_type = _upload_context["entity_type"]
    entity_id = _upload_context["entity_id"]
    if entity_type is None or entity_id is None:
        return
    public_id = _generate_public_id(entity_type, entity_id)
    try:
        cloudinary.uploader.destroy(public_id)
    except Exception:
        # Non-fatal: if delete fails, we still proceed with the new upload
        pass


def _validate_image_bytes(content: bytes, content_type: str = None) -> None:
    """Validate that content is a valid image with an allowed format using Pillow; raise if not."""
    if not content:
        raise ValueError("Image must be between 1 byte and 5 MB")
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
        if img.format not in {"JPEG", "PNG", "WEBP"}:
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

        # Determine folder and public ID based on upload context
        entity_type = _upload_context["entity_type"]
        entity_id = _upload_context["entity_id"]

        if entity_type == "club":
            folder = f"{CLOUDINARY_BASE_FOLDER}/{CLUB_LOGOS_FOLDER}"
            public_id = _generate_public_id("club", entity_id)
        elif entity_type == "event":
            folder = f"{CLOUDINARY_BASE_FOLDER}/{EVENT_POSTERS_FOLDER}"
            public_id = _generate_public_id("event", entity_id)
        else:
            folder = CLOUDINARY_BASE_FOLDER
            public_id = None

        # Replace: delete previous CampusLoop asset if context is set
        if entity_type is not None and entity_id is not None:
            _delete_previous_asset()

        ext = ALLOWED_IMAGE_TYPES[content_type]
        upload_kwargs = {
            "folder": folder,
            "format": ext.lstrip("."),
        }
        if public_id is not None:
            upload_kwargs["public_id"] = public_id

        result = cloudinary.uploader.upload(
            io.BytesIO(content),
            **upload_kwargs,
        )
        return result["secure_url"]


storage: StorageService = LocalStorageService() if not get_settings().is_production else CloudinaryStorageService()