import os


os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "authentication-test-secret-not-for-production"
os.environ["JWT_EXPIRY_MINUTES"] = "15"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import ApprovalStatus, Club, ClubAdminMembership, Event, EventStatus, User, UserRole
from app.security import create_access_token, hash_password


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, autoflush=False, autocommit=False)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def account_factory(db_session):
    counter = 0
    def create(role=UserRole.STUDENT, *, approved=True):
        nonlocal counter
        counter += 1
        user = User(name=f"Test User {counter}", email=f"user{counter}@example.com", password_hash=hash_password("strong-password"), role=role, is_active=True)
        db_session.add(user); db_session.flush()
        club = None
        if role == UserRole.CLUB_ADMIN:
            club = Club(name=f"Test Club {counter}", slug=f"test-club-{counter}", description="A test club for CampusLoop workflows.", category="Technology", contact_email=user.email, faculty_coordinator="Faculty Test", student_coordinator="Student Test", approval_status=ApprovalStatus.APPROVED if approved else ApprovalStatus.PENDING, is_active=True)
            user.is_active = approved
            db_session.add(club); db_session.flush(); db_session.add(ClubAdminMembership(user_id=user.id, club_id=club.id))
        db_session.commit()
        return user, club, {"Authorization": f"Bearer {create_access_token(str(user.id))}"}
    return create


@pytest.fixture
def event_factory(db_session):
    from datetime import datetime, timedelta, timezone
    def create(club, creator, *, status=EventStatus.PUBLISHED, capacity=10, is_paid=False, deadline_days=5, category="Technology", entry_fee_paise=None):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        ef = entry_fee_paise if entry_fee_paise is not None else (15000 if is_paid else 0)
        event = Event(title="Campus Tech Fest", description="A technology festival for college students.", category=category, venue="Main Auditorium", event_date=now + timedelta(days=10), end_date=now + timedelta(days=10, hours=2), registration_deadline=now + timedelta(days=deadline_days), capacity=capacity, club_id=club.id, created_by_id=creator.id, status=status, is_published=status == EventStatus.PUBLISHED, is_paid=is_paid, entry_fee_paise=ef)
        db_session.add(event); db_session.commit(); db_session.refresh(event); return event
    return create
