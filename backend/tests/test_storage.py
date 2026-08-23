from io import BytesIO
from types import SimpleNamespace

from PIL import Image

from app import storage


def image_bytes():
    image = Image.new("RGB", (2, 2), "white")
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def test_cloudinary_assets_use_distinct_namespaces_and_cleanup(monkeypatch):
    settings = SimpleNamespace(
        cloudinary_cloud_name="test-cloud",
        cloudinary_api_key="test-key",
        cloudinary_api_secret=SimpleNamespace(get_secret_value=lambda: "test-secret"),
    )
    uploads = []
    deletions = []

    monkeypatch.setattr(storage, "get_settings", lambda: settings)
    monkeypatch.setattr(storage.cloudinary.uploader, "destroy", lambda public_id: deletions.append(public_id))
    monkeypatch.setattr(
        storage.cloudinary.uploader,
        "upload",
        lambda content, **kwargs: uploads.append(kwargs) or {"secure_url": "https://cdn.example/image"},
    )

    service = storage.CloudinaryStorageService()
    service.save_image(image_bytes(), "image/png", entity_type="club", entity_id=7, asset_type="logo")
    service.save_image(image_bytes(), "image/png", entity_type="club", entity_id=7, asset_type="banner")
    service.save_image(image_bytes(), "image/png", entity_type="event", entity_id=9, asset_type="poster")
    service.save_image(image_bytes(), "image/png", entity_type="event", entity_id=9, asset_type="banner")

    assert [item["folder"] for item in uploads] == [
        "campusloop/clubs/logos",
        "campusloop/clubs/banners",
        "campusloop/events/posters",
        "campusloop/events/banners",
    ]
    assert [item["public_id"] for item in uploads] == [
        "club_logo_7",
        "club_banner_7",
        "event_poster_9",
        "event_banner_9",
    ]
    assert deletions == [
        "campusloop/clubs/logos/club_logo_7",
        "campusloop/clubs/banners/club_banner_7",
        "campusloop/events/posters/event_poster_9",
        "campusloop/events/banners/event_banner_9",
    ]
