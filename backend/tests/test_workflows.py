from datetime import datetime, timedelta, timezone


def signup(client, name, email, role):
    response = client.post(
        "/auth/signup",
        json={"name": name, "email": email, "password": "workflow-password", "role": role},
    )
    assert response.status_code == 201


def login_headers(client, email):
    response = client.post(
        "/auth/login",
        data={"username": email, "password": "workflow-password"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_complete_student_and_organizer_workflows(client):
    signup(client, "Workflow Organizer", "organizer@workflow.example.com", "organizer")
    signup(client, "Workflow Student", "student@workflow.example.com", "student")
    organizer_headers = login_headers(client, "organizer@workflow.example.com")
    student_headers = login_headers(client, "student@workflow.example.com")

    # A saved token restores each role's session through /auth/me.
    assert client.get("/auth/me", headers=organizer_headers).json()["role"] == "organizer"
    assert client.get("/auth/me", headers=student_headers).json()["role"] == "student"

    event_date = datetime.now(timezone.utc) + timedelta(days=14)
    deadline = event_date - timedelta(days=2)
    create_response = client.post(
        "/events",
        headers=organizer_headers,
        json={
            "title": "Workflow Engineering Meetup",
            "description": "An end-to-end integration event.",
            "category": "Technology",
            "venue": "Innovation Hall",
            "event_date": event_date.isoformat(),
            "registration_deadline": deadline.isoformat(),
            "capacity": 2,
        },
    )
    assert create_response.status_code == 201
    event_id = create_response.json()["id"]
    assert create_response.json()["status"] == "draft"

    edit_response = client.patch(
        f"/events/{event_id}",
        headers=organizer_headers,
        json={"title": "Workflow Campus Meetup"},
    )
    assert edit_response.status_code == 200

    publish_response = client.post(f"/events/{event_id}/publish", headers=organizer_headers)
    assert publish_response.status_code == 200
    assert publish_response.json()["status"] == "published"

    list_response = client.get(
        "/events",
        params={
            "title": "Campus",
            "category": "technology",
            "date": event_date.date().isoformat(),
        },
    )
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()["items"]] == [event_id]
    assert client.get(f"/events/{event_id}").status_code == 200

    registration_response = client.post(
        f"/registrations/events/{event_id}", headers=student_headers
    )
    assert registration_response.status_code == 201
    assert registration_response.json()["event"]["registered_count"] == 1
    assert client.post(
        f"/registrations/events/{event_id}", headers=student_headers
    ).status_code == 409

    my_registrations = client.get("/registrations/me", headers=student_headers)
    assert my_registrations.status_code == 200
    assert my_registrations.json()["total"] == 1

    attendees = client.get(
        f"/registrations/events/{event_id}/attendees", headers=organizer_headers
    )
    assert attendees.status_code == 200
    assert attendees.json()["items"][0]["student"]["email"] == "student@workflow.example.com"

    cancellation = client.delete(
        f"/registrations/events/{event_id}", headers=student_headers
    )
    assert cancellation.status_code == 200
    assert client.get("/registrations/me", headers=student_headers).json()["total"] == 0

    event_cancellation = client.post(
        f"/events/{event_id}/cancel", headers=organizer_headers
    )
    assert event_cancellation.status_code == 200
    assert event_cancellation.json()["status"] == "cancelled"
    assert client.get(f"/events/{event_id}").status_code == 404
    assert client.get("/events", params={"title": "Workflow Campus"}).json()["total"] == 0
