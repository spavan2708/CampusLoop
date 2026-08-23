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
    monkeypatch.setattr(storage, "get_settings", lambda: settings)
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


def test_failed_cloudinary_replacement_does_not_delete_existing_asset(monkeypatch):
    settings = SimpleNamespace(
        cloudinary_cloud_name="test-cloud",
        cloudinary_api_key="test-key",
        cloudinary_api_secret=SimpleNamespace(get_secret_value=lambda: "test-secret"),
    )
    uploads = []
    monkeypatch.setattr(storage, "get_settings", lambda: settings)
    monkeypatch.setattr(
        storage.cloudinary.uploader,
        "upload",
        lambda content, **kwargs: uploads.append(kwargs) or (_ for _ in ()).throw(RuntimeError("upload failed")),
    )

    service = storage.CloudinaryStorageService()
    try:
        service.save_image(image_bytes(), "image/png", entity_type="event", entity_id=9, asset_type="poster")
        assert False, "Expected the upload to fail"
    except RuntimeError as exc:
        assert str(exc) == "upload failed"
    assert uploads == [{"folder": "campusloop/events/posters", "format": "png", "public_id": "event_poster_9"}]
