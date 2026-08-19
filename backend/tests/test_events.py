from datetime import datetime, timedelta, timezone

import pytest


PASSWORD = "strong-password"


def signup_and_login(client, email: str, role: str) -> dict[str, str]:
    signup_response = client.post(
        "/auth/signup",
        json={
            "name": email.split("@")[0].title(),
            "email": email,
            "password": PASSWORD,
            "role": role,
        },
    )
    assert signup_response.status_code == 201
    login_response = client.post(
        "/auth/login",
        data={"username": email, "password": PASSWORD},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def future_datetime(days: int, hour: int = 12) -> datetime:
    target = datetime.now(timezone.utc) + timedelta(days=days)
    return target.replace(hour=hour, minute=0, second=0, microsecond=0)


def event_payload(
    *,
    title: str = "Robotics Workshop",
    category: str = "Technology",
    event_date: datetime | None = None,
    registration_deadline: datetime | None = None,
    capacity: int = 50,
) -> dict:
    event_date = event_date or future_datetime(10)
    registration_deadline = registration_deadline or event_date - timedelta(days=2)
    return {
        "title": title,
        "description": "Build and program a small autonomous robot.",
        "category": category,
        "venue": "Engineering Block",
        "event_date": event_date.isoformat(),
        "registration_deadline": registration_deadline.isoformat(),
        "capacity": capacity,
    }


def create_event(client, headers, **payload_overrides):
    return client.post(
        "/events",
        headers=headers,
        json=event_payload(**payload_overrides),
    )


def test_only_organizers_can_create_events(client):
    student_headers = signup_and_login(
        client,
        "student@example.com",
        "student",
    )

    assert client.post("/events", json=event_payload()).status_code == 401
    assert (
        client.post("/events", headers=student_headers, json=event_payload()).status_code
        == 403
    )


def test_organizer_creates_draft_and_lists_own_events(client):
    headers = signup_and_login(client, "owner@example.com", "organizer")

    create_response = create_event(client, headers)
    assert create_response.status_code == 201
    assert create_response.json()["status"] == "draft"

    mine_response = client.get("/events/mine", headers=headers)
    assert mine_response.status_code == 200
    assert mine_response.json()["total"] == 1
    assert mine_response.json()["items"][0]["title"] == "Robotics Workshop"


def test_drafts_are_private_and_published_events_are_public(client):
    headers = signup_and_login(client, "owner@example.com", "organizer")
    event_id = create_event(client, headers).json()["id"]

    assert client.get("/events").json() == {"items": [], "total": 0}
    assert client.get(f"/events/{event_id}").status_code == 404

    publish_response = client.post(f"/events/{event_id}/publish", headers=headers)
    assert publish_response.status_code == 200
    assert publish_response.json()["status"] == "published"
    assert client.get("/events").json()["total"] == 1
    assert client.get(f"/events/{event_id}").status_code == 200


def test_only_owner_can_update_publish_or_cancel(client):
    owner_headers = signup_and_login(client, "owner@example.com", "organizer")
    other_headers = signup_and_login(client, "other@example.com", "organizer")
    event_id = create_event(client, owner_headers).json()["id"]

    assert (
        client.patch(
            f"/events/{event_id}",
            headers=other_headers,
            json={"title": "Stolen Event"},
        ).status_code
        == 403
    )
    assert (
        client.post(f"/events/{event_id}/publish", headers=other_headers).status_code
        == 403
    )
    assert (
        client.post(f"/events/{event_id}/cancel", headers=other_headers).status_code
        == 403
    )

    update_response = client.patch(
        f"/events/{event_id}",
        headers=owner_headers,
        json={"title": "Updated Workshop", "capacity": 75},
    )
    assert update_response.status_code == 200
    assert update_response.json()["title"] == "Updated Workshop"
    assert update_response.json()["capacity"] == 75


@pytest.mark.parametrize(
    "payload",
    [
        event_payload(capacity=0),
        event_payload(
            event_date=datetime.now(timezone.utc) - timedelta(days=1),
            registration_deadline=datetime.now(timezone.utc) - timedelta(days=2),
        ),
        event_payload(
            event_date=future_datetime(5),
            registration_deadline=future_datetime(6),
        ),
    ],
    ids=["zero-capacity", "past-event", "deadline-after-event"],
)
def test_event_creation_validation(client, payload):
    headers = signup_and_login(client, "owner@example.com", "organizer")

    response = client.post("/events", headers=headers, json=payload)
    assert response.status_code == 422


def test_update_validates_combined_event_dates(client):
    headers = signup_and_login(client, "owner@example.com", "organizer")
    event_id = create_event(client, headers).json()["id"]

    response = client.patch(
        f"/events/{event_id}",
        headers=headers,
        json={"registration_deadline": future_datetime(20).isoformat()},
    )
    assert response.status_code == 422


def test_cancelled_event_is_hidden_and_cannot_be_modified_or_published(client):
    headers = signup_and_login(client, "owner@example.com", "organizer")
    event_id = create_event(client, headers).json()["id"]
    assert client.post(f"/events/{event_id}/publish", headers=headers).status_code == 200

    cancel_response = client.post(f"/events/{event_id}/cancel", headers=headers)
    assert cancel_response.status_code == 200
    assert cancel_response.json()["status"] == "cancelled"
    assert client.get(f"/events/{event_id}").status_code == 404
    assert client.get("/events").json()["total"] == 0
    assert (
        client.patch(
            f"/events/{event_id}",
            headers=headers,
            json={"title": "Changed"},
        ).status_code
        == 409
    )
    assert client.post(f"/events/{event_id}/publish", headers=headers).status_code == 409


def test_public_event_filters_support_title_category_and_date(client):
    headers = signup_and_login(client, "owner@example.com", "organizer")
    robotics_date = future_datetime(12)
    music_date = future_datetime(14)
    robotics_id = create_event(
        client,
        headers,
        title="Robotics Workshop",
        category="Technology",
        event_date=robotics_date,
    ).json()["id"]
    music_id = create_event(
        client,
        headers,
        title="Annual Music Night",
        category="Cultural",
        event_date=music_date,
    ).json()["id"]
    assert client.post(f"/events/{robotics_id}/publish", headers=headers).status_code == 200
    assert client.post(f"/events/{music_id}/publish", headers=headers).status_code == 200

    title_result = client.get("/events", params={"title": "robot"}).json()
    category_result = client.get("/events", params={"category": "cultural"}).json()
    date_result = client.get(
        "/events",
        params={"date": robotics_date.date().isoformat()},
    ).json()

    assert [event["id"] for event in title_result["items"]] == [robotics_id]
    assert [event["id"] for event in category_result["items"]] == [music_id]
    assert [event["id"] for event in date_result["items"]] == [robotics_id]
