from fastapi import HTTPException
from sqlalchemy import text

from app.config import BACKEND_DIR, DEFAULT_DATABASE_URL
from app.database import engine
from app.dependencies import require_organizer, require_student
from app.models import User, UserRole


def signup(client, email="student@example.com", role="student"):
    return client.post(
        "/auth/signup",
        json={
            "name": "Test User",
            "email": email,
            "password": "strong-password",
            "role": role,
        },
    )


def login(client, email="student@example.com", password="strong-password"):
    return client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )


def test_default_database_url_points_to_backend_database():
    expected_path = (BACKEND_DIR / "campusloop.db").as_posix()
    assert DEFAULT_DATABASE_URL == f"sqlite:///{expected_path}"


def test_sqlite_foreign_keys_are_enabled():
    with engine.connect() as connection:
        assert connection.execute(text("PRAGMA foreign_keys")).scalar_one() == 1


def test_signup_normalizes_email_and_hashes_password(client, db_session):
    response = signup(client, email="Student@Example.COM")

    assert response.status_code == 201
    assert response.json()["email"] == "student@example.com"
    assert "password" not in response.json()
    user = db_session.query(User).one()
    assert user.email == "student@example.com"
    assert user.password_hash != "strong-password"
    assert user.password_hash.startswith("$argon2")


def test_signup_rejects_case_insensitive_duplicate(client):
    assert signup(client, email="Student@Example.com").status_code == 201
    response = signup(client, email="student@example.COM")

    assert response.status_code == 409


def test_signup_validates_input(client):
    response = client.post(
        "/auth/signup",
        json={
            "name": "   ",
            "email": "not-an-email",
            "password": "short",
            "role": "invalid",
        },
    )

    assert response.status_code == 422


def test_login_and_me_are_case_insensitive(client):
    assert signup(client).status_code == 201
    login_response = login(client, email="STUDENT@EXAMPLE.COM")

    assert login_response.status_code == 200
    token_body = login_response.json()
    assert token_body["token_type"] == "bearer"
    me_response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token_body['access_token']}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "student@example.com"


def test_login_rejects_bad_password(client):
    assert signup(client).status_code == 201
    response = login(client, password="wrong-password")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_me_rejects_missing_or_invalid_token(client):
    missing_response = client.get("/auth/me")
    invalid_response = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert missing_response.status_code == 401
    assert invalid_response.status_code == 401


def test_inactive_user_cannot_login_or_use_existing_token(client, db_session):
    assert signup(client).status_code == 201
    token = login(client).json()["access_token"]
    user = db_session.query(User).one()
    user.is_active = False
    db_session.commit()

    assert login(client).status_code == 401
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


def test_role_dependencies_allow_only_the_expected_role():
    student = User(
        name="Student",
        email="student@example.com",
        password_hash="unused",
        role=UserRole.STUDENT,
    )
    organizer = User(
        name="Organizer",
        email="organizer@example.com",
        password_hash="unused",
        role=UserRole.ORGANIZER,
    )

    assert require_student(student) is student
    assert require_organizer(organizer) is organizer

    for dependency, user in (
        (require_student, organizer),
        (require_organizer, student),
    ):
        try:
            dependency(user)
        except HTTPException as exc:
            assert exc.status_code == 403
        else:
            raise AssertionError("Role dependency allowed the wrong role")
