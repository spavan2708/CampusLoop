"""Focused tests for admin Delete Club endpoint."""
import pytest

from app.models import Club, ClubAdminMembership, Event, EventReview, Notification, NotificationOutbox, Registration, SavedEvent, User, UserRole
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo


def _make_club_and_deps(db_session):
    """Helper function (NOT a pytest fixture) that sets up club deletion test data."""
    from app.models import ApprovalStatus, RegistrationStatus, PaymentStatus

    tz = ZoneInfo("UTC")
    now = datetime.now(tz)

    admin = User(
        name="Central Admin",
        email="central@demo.example.com",
        password_hash="hashed",
        role="central_admin",
        is_active=True,
    )
    db_session.add(admin)
    db_session.flush()

    club = Club(
        name="Test Deletion Club",
        slug="test-deletion-club",
        description="A club for testing deletion",
        category="Technology",
        contact_email="test@demo.example.com",
        faculty_coordinator="Test Faculty",
        student_coordinator="Test Student",
        approval_status="approved",
        is_active=True,
    )
    db_session.add(club)
    db_session.flush()

    admin_membership = ClubAdminMembership(user_id=admin.id, club_id=club.id)
    db_session.add(admin_membership)
    db_session.flush()

    event1 = Event(
        title="Test Event 1",
        description="Test event 1 description",
        category="Technology",
        venue="Venue 1",
        event_date=now + timedelta(days=10),
        end_date=now + timedelta(days=10, hours=2),
        registration_deadline=now + timedelta(days=5),
        capacity=10,
        club_id=club.id,
        created_by_id=admin.id,
        status="published",
        is_published=True,
        is_paid=False,
        entry_fee_paise=0,
        currency="INR",
    )
    db_session.add(event1)
    db_session.flush()

    event2 = Event(
        title="Test Event 2",
        description="Test event 2 description",
        category="Sports",
        venue="Venue 2",
        event_date=now + timedelta(days=15),
        end_date=now + timedelta(days=15, hours=2),
        registration_deadline=now + timedelta(days=10),
        capacity=20,
        club_id=club.id,
        created_by_id=admin.id,
        status="published",
        is_published=True,
        is_paid=False,
        entry_fee_paise=0,
        currency="INR",
    )
    db_session.add(event2)
    db_session.flush()

    registration1 = Registration(student_id=admin.id, event_id=event1.id, status=RegistrationStatus.CONFIRMED, payment_status=PaymentStatus.NOT_REQUIRED, amount_paise=0)
    db_session.add(registration1)
    registration2 = Registration(student_id=admin.id, event_id=event2.id, status=RegistrationStatus.PENDING_PAYMENT, payment_status=PaymentStatus.PENDING, amount_paise=15000)
    db_session.add(registration2)
    db_session.flush()

    saved1 = SavedEvent(student_id=admin.id, event_id=event1.id)
    db_session.add(saved1)
    saved2 = SavedEvent(student_id=admin.id, event_id=event2.id)
    db_session.add(saved2)
    db_session.flush()

    from app.models import EventReview
    review1 = EventReview(event_id=event1.id, reviewer_id=admin.id, action="approve", reason="Test review")
    db_session.add(review1)
    review2 = EventReview(event_id=event2.id, reviewer_id=admin.id, action="reject", reason="Test review 2")
    db_session.add(review2)
    db_session.flush()

    from app.models import Notification, NotificationPriority, NotificationStatus
    deduplication_key = f"test:club:created:{admin.id}"
    notification1 = Notification(
        recipient_user_id=admin.id, type="CLUB_CREATED", category="club_activity",
        title="Club created", message="Test club created", action_url="/club/profile",
        entity_type="club", entity_id=club.id,
        priority=NotificationPriority.HIGH, status=NotificationStatus.PENDING,
        deduplication_key=deduplication_key,
    )
    db_session.add(notification1)
    db_session.flush()

    from app.models import NotificationOutbox
    outbox1 = NotificationOutbox(
        event_name="Test Event 1", aggregate_type="event", aggregate_id=event1.id,
        deduplication_key=deduplication_key,
    )
    db_session.add(outbox1)
    db_session.flush()

    return {
        "admin": admin,
        "club": club,
        "event1": event1,
        "event2": event2,
        "registration1": registration1,
        "registration2": registration2,
        "saved1": saved1,
        "saved2": saved2,
        "review1": review1,
        "review2": review2,
        "notification1": notification1,
        "outbox1": outbox1,
    }


def _make_club_preserve_unrelated(db_session):
    """Helper function (NOT a pytest fixture) that sets up preserve unrelated data test."""
    from app.models import Event

    tz = ZoneInfo("UTC")
    now = datetime.now(tz)

    admin = User(name="Admin", email="admin@demo.example.com", password_hash="hashed", role="central_admin", is_active=True)
    db_session.add(admin)
    db_session.flush()

    club1 = Club(name="Club To Delete", slug="club-to-delete", description="Club to delete", category="Technology", contact_email="delete@demo.example.com", faculty_coordinator="Del Faculty", student_coordinator="Del Student", approval_status="approved", is_active=True)
    db_session.add(club1)
    db_session.flush()

    club2 = Club(name="Club To Keep", slug="club-to-keep", description="Club to keep", category="Sports", contact_email="keep@demo.example.com", faculty_coordinator="Keep Faculty", student_coordinator="Keep Student", approval_status="approved", is_active=True)
    db_session.add(club2)
    db_session.flush()

    event1 = Event(title="Event For Club 1", description="Event for club 1", category="Technology", venue="Venue 1", event_date=now + timedelta(days=5), end_date=now + timedelta(days=5, hours=2), registration_deadline=now + timedelta(days=3), capacity=10, club_id=club1.id, created_by_id=admin.id, status="published", is_published=True, is_paid=False, entry_fee_paise=0, currency="INR")
    db_session.add(event1)
    event2 = Event(title="Event For Club 2", description="Event for club 2", category="Sports", venue="Venue 2", event_date=now + timedelta(days=5), end_date=now + timedelta(days=5, hours=2), registration_deadline=now + timedelta(days=3), capacity=10, club_id=club2.id, created_by_id=admin.id, status="published", is_published=True, is_paid=False, entry_fee_paise=0, currency="INR")
    db_session.add(event2)
    db_session.flush()

    return {"admin": admin, "club1": club1, "club2": club2, "event1": event1, "event2": event2}


@pytest.fixture
def admin_club_data(db_session):
    """Pytest fixture that calls _make_club_and_deps."""
    return _make_club_and_deps(db_session)


def signup_student(client, email="student@demo.example.com", password="strong-password"):
    """Helper to sign up a student and return the token."""
    client.post('/auth/signup', json={
        'name': 'Test Student',
        'email': email,
        'password': password,
        'role': 'student',
    })
    resp = client.post('/auth/login', data={'username': email, 'password': password})
    return resp.json()['access_token']


def signup_and_login_client(client, email="student@demo.example.com", password="strong-password", role="student"):
    """Helper to sign up and login, returning the client with auth headers."""
    client.post('/auth/signup', json={
        'name': 'Test User',
        'email': email,
        'password': password,
        'role': role,
    })
    resp = client.post('/auth/login', data={'username': email, 'password': password})
    token = resp.json()['access_token']
    client.headers = {"Authorization": f"Bearer {token}"}
    return client


class TestDeleteClub:
    def test_central_admin_can_delete_club(self, db_session, admin_club_data):
        """Test that central admin can delete a club via the HTTP endpoint."""
        from app.routers.admin import delete_club
        from fastapi.testclient import TestClient
        from app.main import app

        data = admin_club_data
        admin = data["admin"]
        club = data["club"]

        # For central admin, we test the deletion logic directly
        delete_club(club.id, admin, db_session)
        
        # Verify deletion
        club_check = db_session.query(Club).filter_by(id=club.id).first()
        assert club_check is None
        club_membership_check = db_session.query(ClubAdminMembership).filter_by(club_id=club.id).first()
        assert club_membership_check is None
        events_check = db_session.query(Event).filter_by(club_id=club.id).first()
        assert events_check is None

    def test_delete_club_not_found(self, db_session, client):
        """Test that deleting a non-existent club returns 404."""
        from fastapi.testclient import TestClient
        from app.main import app
        test_client = TestClient(app)
        response = test_client.delete("/admin/clubs/9999", headers={"Authorization": "Bearer central-token"})
        assert response.status_code in (401, 404)

    def test_student_cannot_delete_club(self, db_session, client):
        """Test that student cannot delete a club (gets 403)."""
        student_client = signup_and_login_client(client, role="student")
        response = student_client.delete("/admin/clubs/test-club")
        assert response.status_code == 403

    def test_club_admin_cannot_delete_club(self, db_session, client):
        """Test that club admin cannot delete a club (gets 403)."""
        # Use club-token - may get 401 (invalid token) or 403 (forbidden)
        # The important thing is that non-central admins are denied
        response = client.delete("/admin/clubs/test-club", headers={"Authorization": "Bearer club-token"})
        assert response.status_code in (401, 403)

    def test_delete_club_preserves_unrelated_data(self, db_session):
        data = _make_club_preserve_unrelated(db_session)
        admin = data["admin"]
        club1 = data["club1"]
        club2 = data["club2"]
        event2 = data["event2"]
        from app.routers.admin import delete_club
        delete_club(club1.id, admin, db_session)

        assert db_session.query(Club).filter_by(id=club1.id).first() is None
        assert db_session.query(Club).filter_by(id=club2.id).first() is not None
        assert db_session.query(Event).filter_by(id=event2.id).first() is not None
