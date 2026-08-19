from datetime import datetime, timedelta, timezone


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
    return {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }


def create_event(
    client,
    organizer_headers,
    *,
    capacity: int = 10,
    deadline: datetime | None = None,
    publish: bool = True,
) -> int:
    event_date = datetime.now(timezone.utc) + timedelta(days=10)
    deadline = deadline or datetime.now(timezone.utc) + timedelta(days=5)
    response = client.post(
        "/events",
        headers=organizer_headers,
        json={
            "title": "Campus Tech Fest",
            "description": "A technology festival for college students.",
            "category": "Technology",
            "venue": "Main Auditorium",
            "event_date": event_date.isoformat(),
            "registration_deadline": deadline.isoformat(),
            "capacity": capacity,
        },
    )
    assert response.status_code == 201
    event_id = response.json()["id"]
    if publish:
        publish_response = client.post(
            f"/events/{event_id}/publish",
            headers=organizer_headers,
        )
        assert publish_response.status_code == 200
    return event_id


def test_successful_registration_and_student_registration_list(client):
    organizer = signup_and_login(client, "owner@example.com", "organizer")
    student = signup_and_login(client, "student@example.com", "student")
    event_id = create_event(client, organizer)

    response = client.post(
        f"/registrations/events/{event_id}",
        headers=student,
    )
    assert response.status_code == 201
    assert response.json()["event"]["id"] == event_id
    assert response.json()["event"]["status"] == "published"

    mine_response = client.get("/registrations/me", headers=student)
    assert mine_response.status_code == 200
    assert mine_response.json()["total"] == 1
    assert mine_response.json()["items"][0]["event"]["title"] == "Campus Tech Fest"


def test_duplicate_registration_is_rejected(client):
    organizer = signup_and_login(client, "owner@example.com", "organizer")
    student = signup_and_login(client, "student@example.com", "student")
    event_id = create_event(client, organizer)

    assert (
        client.post(f"/registrations/events/{event_id}", headers=student).status_code
        == 201
    )
    duplicate = client.post(f"/registrations/events/{event_id}", headers=student)
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "You are already registered for this event"


def test_event_capacity_cannot_be_exceeded(client):
    organizer = signup_and_login(client, "owner@example.com", "organizer")
    first_student = signup_and_login(client, "first@example.com", "student")
    second_student = signup_and_login(client, "second@example.com", "student")
    event_id = create_event(client, organizer, capacity=1)

    assert (
        client.post(
            f"/registrations/events/{event_id}",
            headers=first_student,
        ).status_code
        == 201
    )
    full_response = client.post(
        f"/registrations/events/{event_id}",
        headers=second_student,
    )
    assert full_response.status_code == 409
    assert full_response.json()["detail"] == "Event capacity has been reached"


def test_expired_registration_deadline_is_rejected(client):
    organizer = signup_and_login(client, "owner@example.com", "organizer")
    student = signup_and_login(client, "student@example.com", "student")
    event_id = create_event(
        client,
        organizer,
        deadline=datetime.now(timezone.utc) - timedelta(minutes=1),
    )

    response = client.post(
        f"/registrations/events/{event_id}",
        headers=student,
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Registration deadline has passed"


def test_draft_and_cancelled_events_reject_registrations(client):
    organizer = signup_and_login(client, "owner@example.com", "organizer")
    student = signup_and_login(client, "student@example.com", "student")
    draft_event_id = create_event(client, organizer, publish=False)
    cancelled_event_id = create_event(client, organizer)
    assert (
        client.post(
            f"/events/{cancelled_event_id}/cancel",
            headers=organizer,
        ).status_code
        == 200
    )

    for event_id in (draft_event_id, cancelled_event_id):
        response = client.post(
            f"/registrations/events/{event_id}",
            headers=student,
        )
        assert response.status_code == 409
        assert response.json()["detail"] == "Only published events accept registrations"


def test_student_and_organizer_role_restrictions(client):
    organizer = signup_and_login(client, "owner@example.com", "organizer")
    student = signup_and_login(client, "student@example.com", "student")
    event_id = create_event(client, organizer)

    assert (
        client.post(
            f"/registrations/events/{event_id}",
            headers=organizer,
        ).status_code
        == 403
    )
    assert client.get("/registrations/me", headers=organizer).status_code == 403
    assert (
        client.delete(
            f"/registrations/events/{event_id}",
            headers=organizer,
        ).status_code
        == 403
    )
    assert (
        client.get(
            f"/registrations/events/{event_id}/attendees",
            headers=student,
        ).status_code
        == 403
    )


def test_only_owning_organizer_can_view_attendees(client):
    owner = signup_and_login(client, "owner@example.com", "organizer")
    other_organizer = signup_and_login(client, "other@example.com", "organizer")
    student = signup_and_login(client, "student@example.com", "student")
    event_id = create_event(client, owner)
    assert (
        client.post(f"/registrations/events/{event_id}", headers=student).status_code
        == 201
    )

    forbidden_response = client.get(
        f"/registrations/events/{event_id}/attendees",
        headers=other_organizer,
    )
    assert forbidden_response.status_code == 403

    attendee_response = client.get(
        f"/registrations/events/{event_id}/attendees",
        headers=owner,
    )
    assert attendee_response.status_code == 200
    assert attendee_response.json()["event"]["id"] == event_id
    assert attendee_response.json()["total"] == 1
    assert attendee_response.json()["items"][0]["student"]["email"] == (
        "student@example.com"
    )


def test_successful_cancellation_and_missing_registration_error(client):
    organizer = signup_and_login(client, "owner@example.com", "organizer")
    student = signup_and_login(client, "student@example.com", "student")
    event_id = create_event(client, organizer)
    assert (
        client.post(f"/registrations/events/{event_id}", headers=student).status_code
        == 201
    )

    cancel_response = client.delete(
        f"/registrations/events/{event_id}",
        headers=student,
    )
    assert cancel_response.status_code == 200
    assert cancel_response.json()["event"]["id"] == event_id
    assert client.get("/registrations/me", headers=student).json()["total"] == 0

    missing_response = client.delete(
        f"/registrations/events/{event_id}",
        headers=student,
    )
    assert missing_response.status_code == 404
    assert missing_response.json()["detail"] == "Registration not found"
