from pathlib import Path
from secrets import token_urlsafe

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


class LocalStorageService:
    def save_image(self, content: bytes, content_type: str) -> str:
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise ValueError("Only JPEG, PNG, and WebP images are accepted")
        if not content or len(content) > MAX_IMAGE_BYTES:
            raise ValueError("Image must be between 1 byte and 5 MB")
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"{token_urlsafe(24)}{ALLOWED_IMAGE_TYPES[content_type]}"
        (UPLOAD_DIR / filename).write_bytes(content)
        return f"/uploads/{filename}"


storage = LocalStorageService()
