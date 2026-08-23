"""Seed clearly marked, repeatable demo data for local or explicitly confirmed production use."""

import argparse
import os
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models import (
    ApprovalStatus,
    Club,
    ClubAdminMembership,
    Event,
    EventStatus,
    NotificationPriority,
    PaymentStatus,
    Registration,
    RegistrationStatus,
    SavedEvent,
    User,
    UserRole,
)
from app.notifications import create_notification
from app.security import hash_password

DEMO_STUDENT_EMAIL = "student.demo@example.com"
NEW_EMAILS = {
    "student": "student.demo@example.com",
    "nexus": "nexus.demo@example.com",
    "aperture": "aperture.demo@example.com",
    "rhythm": "rhythm.demo@example.com",
    "velocity": "velocity.demo@example.com",
    "founders": "founders.demo@example.com",
}
LEGACY_EMAILS = {
    "student": "student@demo.campusloop.invalid",
    "nexus": "nexus@demo.campusloop.invalid",
    "aperture": "aperture@demo.campusloop.invalid",
    "rhythm": "rhythm@demo.campusloop.invalid",
    "velocity": "velocity@demo.campusloop.invalid",
    "founders": "founders@demo.campusloop.invalid",
}
DEMO_ORGANIZER_PASSWORD_ENV = "DEMO_ORGANIZER_PASSWORD"
DEMO_STUDENT_PASSWORD_ENV = "DEMO_STUDENT_PASSWORD"

CLUBS = [
    {
        "name": "Nexus Tech Society",
        "slug": "nexus-tech-society",
        "category": "Technology",
        "description": "A student community for developers, builders and emerging technology enthusiasts.",
        "email": "nexus.demo@example.com",
        "organizer": "Aarav Demo",
        "events": [
            ("HackSprint 2026", "Technology", "Innovation Lab", 120, False, 0, "A fast-paced campus hackathon where student teams turn ideas into working prototypes."),
            ("AI Builders Workshop", "Technology", "Computing Lab 2", 60, False, 0, "A hands-on workshop for building practical AI-powered applications with guided mentoring."),
        ],
    },
    {
        "name": "Aperture Collective",
        "slug": "aperture-collective",
        "category": "Photography",
        "description": "A creative community for photographers, filmmakers and visual storytellers.",
        "email": "aperture.demo@example.com",
        "organizer": "Maya Demo",
        "events": [
            ("Campus Through Your Lens", "Photography", "Main Plaza", 40, False, 0, "A guided photo walk exploring architecture, people and everyday campus stories."),
            ("Frames: Student Photography Exhibition", "Arts", "Exhibition Hall", 100, False, 0, "An exhibition featuring visual stories and photography created by students."),
        ],
    },
    {
        "name": "Rhythm & Roots",
        "slug": "rhythm-and-roots",
        "category": "Cultural",
        "description": "Bringing campus culture alive through music, dance and performance.",
        "email": "rhythm.demo@example.com",
        "organizer": "Diya Demo",
        "events": [
            ("Open Mic Night", "Cultural", "Amphitheatre", 180, False, 0, "An evening of music, poetry, comedy and student performances."),
            ("Battle of the Bands", "Music", "Main Auditorium", 300, True, 10000, "Campus bands perform live and compete in front of students and judges."),
        ],
    },
    {
        "name": "Velocity Sports Club",
        "slug": "velocity-sports-club",
        "category": "Sports",
        "description": "Community tournaments, fitness events and recreational sports for students.",
        "email": "velocity.demo@example.com",
        "organizer": "Rohan Demo",
        "events": [
            ("Campus Football 5v5", "Sports", "Football Ground", 80, True, 15000, "A fast-paced five-a-side football tournament for student teams."),
            ("Sunrise Run 5K", "Fitness", "Main Gate", 150, False, 0, "A friendly campus 5K for runners of every experience level."),
        ],
    },
    {
        "name": "Founders Circle",
        "slug": "founders-circle",
        "category": "Entrepreneurship",
        "description": "A community for students exploring startups, product building and entrepreneurship.",
        "email": "founders.demo@example.com",
        "organizer": "Arjun Demo",
        "events": [
            ("Startup Pitch Arena", "Entrepreneurship", "Seminar Hall", 100, False, 0, "Students pitch startup ideas and receive feedback from founders and mentors."),
            ("From Idea to MVP", "Entrepreneurship", "Innovation Centre", 70, False, 0, "A practical session on validating ideas, designing an MVP and finding first users."),
        ],
    },
]


def _conflict(message: str) -> ValueError:
    return ValueError(f"Demo seed conflict: {message}")


def _find_legacy_key(email: str) -> str | None:
    """Return the legacy key if email matches a known legacy address, else None."""
    for key, le in LEGACY_EMAILS.items():
        if email == le:
            return key
    return None


def _find_new_key(email: str) -> str | None:
    """Return the new email key if email matches a known new address, else None."""
    for key, ne in NEW_EMAILS.items():
        if email == ne:
            return key
    return None


def _get_or_create_user(db, *, name: str, email: str, role: UserRole, password: str):
    """Get or create a demo user with safe legacy migration.

    Priority:
    1. If new email already exists -> verify name/role, reuse
    2. If new email doesn't exist -> check whether any legacy (.invalid) users exist
       and migrate the one matching this new email's legacy key
    3. If neither exists -> create new user
    4. If both new and legacy exist for same identifier -> abort with conflict
    """

    # Check if a user with the exact new email already exists
    existing_by_new = db.query(User).filter(User.email == email).one_or_none()

    # Build the legacy key that would correspond to this new email
    # (e.g., new email student.demo@example.com -> legacy key "student")
    new_key = _find_new_key(email)

    # Check whether any legacy (.invalid) users exist in the session
    legacy_users_by_key = {}
    for le_key, le_email in LEGACY_EMAILS.items():
        u = db.query(User).filter(User.email == le_email).one_or_none()
        if u is not None:
            legacy_users_by_key[le_key] = u

    # Case 1: New email already exists
    if existing_by_new is not None:
        if existing_by_new.name != name or existing_by_new.role != role:
            raise _conflict(f"user {email} is not the expected demo account")
        existing_by_new.is_active = True
        return existing_by_new, False  # reused

    # Case 2: New email doesn't exist yet
    if existing_by_new is None:
        # If there's a legacy user matching this new email's key
        if new_key and new_key in legacy_users_by_key:
            # Migrate that legacy user: change only its email to the new format
            legacy_user = legacy_users_by_key[new_key]
            legacy_user.email = email
            db.flush()
            legacy_user.is_active = True
            return legacy_user, True  # migrated (counts as reused)

        # No legacy users matching this key -> create new user normally
        user = User(name=name, email=email, password_hash=hash_password(password), role=role, is_active=True)
        db.add(user)
        db.flush()
        return user, True  # newly created

    # Case 3: Both new and legacy exist for same identifier -> abort with conflict
    # This happens if somehow both a new and legacy user exist with the same base identifier
    raise _conflict(
        f"Both new email {email} and legacy email exist. "
        "Aborting to prevent duplicate demo users."
    )

    # Should not reach here, but safety
    raise _conflict("Unexpected state in _get_or_create_user")


def _get_or_create_club(db, spec):
    club = db.query(Club).filter(Club.slug == spec["slug"]).one_or_none()
    if club is None:
        club = Club(
            name=spec["name"], slug=spec["slug"], description=spec["description"],
            category=spec["category"], contact_email=spec["email"],
            faculty_coordinator="Demo Faculty Coordinator", student_coordinator=spec["organizer"],
            approval_status=ApprovalStatus.APPROVED, is_active=True,
        )
        db.add(club)
        db.flush()
        return club, True
    expected = (spec["name"], spec["category"], spec["description"], spec["email"])
    actual = (club.name, club.category, club.description, club.contact_email)
    if actual != expected:
        raise _conflict(f"club slug {spec['slug']} belongs to another record")
    club.approval_status = ApprovalStatus.APPROVED
    club.is_active = True
    return club, False


def _link_organizer(db, organizer, club):
    memberships = db.query(ClubAdminMembership).filter(ClubAdminMembership.user_id == organizer.id).all()
    if any(item.club_id != club.id for item in memberships) or len(memberships) > 1:
        raise _conflict(f"organizer {organizer.email} has an unexpected club membership")
    if memberships:
        return False
    db.add(ClubAdminMembership(user_id=organizer.id, club_id=club.id))
    db.flush()
    return True


def _get_or_create_event(db, spec, club, organizer, start, index):
    title, category, venue, capacity, is_paid, fee, description = spec
    event = db.query(Event).filter(Event.club_id == club.id, Event.title == title).one_or_none()
    event_date = start + timedelta(days=7 + index * 3 if index == 0 else 20 + index * 5, hours=10)
    deadline = event_date - timedelta(days=2)
    if event is None:
        event = Event(
            title=title, description=description, category=category, venue=venue,
            event_date=event_date, end_date=event_date + timedelta(hours=2),
            registration_deadline=deadline, capacity=capacity, tags="demo, campus",
            eligibility="Open to all students", instructions="Bring your campus ID.",
            contact_details=organizer.email, is_paid=is_paid, entry_fee_paise=fee,
            currency="INR", status=EventStatus.PUBLISHED, is_published=True,
            club_id=club.id, created_by_id=organizer.id, organizer_id=organizer.id,
        )
        db.add(event)
        db.flush()
        return event, True
    expected = (event.description, event.category, event.venue, event.capacity, event.is_paid, event.entry_fee_paise, event.club_id, event.created_by_id)
    actual = (description, category, venue, capacity, is_paid, fee, club.id, organizer.id)
    if expected != actual:
        raise _conflict(f"event {title} does not match the expected demo record")
    event.event_date = event_date
    event.end_date = event_date + timedelta(hours=2)
    event.registration_deadline = deadline
    event.status = EventStatus.PUBLISHED
    event.is_published = True
    return event, False


def _ensure_registration(db, student, event, status, payment_status, amount_paise=0):
    registration = db.query(Registration).filter_by(student_id=student.id, event_id=event.id).one_or_none()
    if registration is None:
        registration = Registration(student_id=student.id, event_id=event.id)
        db.add(registration)
    registration.status = status
    registration.payment_status = payment_status
    registration.amount_paise = amount_paise
    return registration, registration.id is None


def _ensure_saved_event(db, student, event):
    saved = db.query(SavedEvent).filter_by(student_id=student.id, event_id=event.id).one_or_none()
    if saved is None:
        db.add(SavedEvent(student_id=student.id, event_id=event.id))
        return True
    return False


def seed_demo(db, *, student_password: str, organizer_password: str) -> dict[str, int]:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    student, student_created = _get_or_create_user(db, name="Demo Student", email=DEMO_STUDENT_EMAIL, role=UserRole.STUDENT, password=student_password)
    event_map = {}
    created_users = int(student_created)
    created_clubs = 0
    created_events = 0
    created_memberships = 0
    for spec in CLUBS:
        # CLUBS already contain new emails; no .replace() needed
        organizer_email = spec["email"]
        organizer, created = _get_or_create_user(db, name=spec["organizer"], email=organizer_email, role=UserRole.CLUB_ADMIN, password=organizer_password)
        created_users += int(created)
        club, created = _get_or_create_club(db, spec)
        created_clubs += int(created)
        created_memberships += int(_link_organizer(db, organizer, club))
        for event_index, event_spec in enumerate(spec["events"]):
            event, created = _get_or_create_event(db, event_spec, club, organizer, now, event_index)
            event_map[event.title] = event
            created_events += int(created)

    registrations = [
        _ensure_registration(db, student, event_map["HackSprint 2026"], RegistrationStatus.CONFIRMED, PaymentStatus.NOT_REQUIRED),
        _ensure_registration(db, student, event_map["Open Mic Night"], RegistrationStatus.CONFIRMED, PaymentStatus.NOT_REQUIRED),
        _ensure_registration(db, student, event_map["Campus Football 5v5"], RegistrationStatus.PENDING_PAYMENT, PaymentStatus.PENDING, event_map["Campus Football 5v5"].entry_fee_paise),
        _ensure_registration(db, student, event_map["AI Builders Workshop"], RegistrationStatus.WAITLISTED, PaymentStatus.NOT_REQUIRED),
    ]

    saved_count = sum(_ensure_saved_event(db, student, event_map[title]) for title in ("Startup Pitch Arena", "Campus Through Your Lens", "AI Builders Workshop"))
    notifications = [
        ("REGISTRATION_CONFIRMED", "registrations", "Registration confirmed", "Your place at HackSprint 2026 is confirmed.", "HackSprint 2026", NotificationPriority.HIGH),
        ("EVENT_STARTING_SOON", "event_reminders", "Open Mic Night is coming up", "Open Mic Night starts soon at the Amphitheatre.", "Open Mic Night", NotificationPriority.NORMAL),
        ("SAVED_EVENT_REGISTRATION_REMINDER", "saved_events", "Startup Pitch Arena reminder", "Startup Pitch Arena is saved to your events.", "Startup Pitch Arena", NotificationPriority.NORMAL),
        ("PAYMENT_PENDING", "payments", "Payment pending", "Campus Football 5v5 is reserved pending payment. No payment has been collected.", "Campus Football 5v5", NotificationPriority.HIGH),
    ]
    created_notifications = 0
    for notification_type, category, title, message, event_title, priority in notifications:
        event = event_map[event_title]
        notification = create_notification(
            db, recipient_user_id=student.id, notification_type=notification_type, category=category,
            title=title, message=message, action_url="/student/registrations", event_id=event.id,
            club_id=event.club_id, entity_type="event", entity_id=event.id, priority=priority,
            deduplication_key=f"demo:student:{notification_type}:{event.id}",
        )
        created_notifications += int(notification is not None and notification.id is None)
    return {
        "created_users": created_users,
        "created_clubs": created_clubs,
        "created_events": created_events,
        "created_memberships": created_memberships,
        "created_registrations": sum(created for _, created in registrations),
        "created_saved_events": saved_count,
        "created_notifications": created_notifications,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed CampusLoop demo data")
    parser.add_argument("--confirm-production", action="store_true", help="Allow seeding when ENVIRONMENT=production")
    args = parser.parse_args()
    student_password = os.getenv(DEMO_STUDENT_PASSWORD_ENV)
    organizer_password = os.getenv(DEMO_ORGANIZER_PASSWORD_ENV)
    missing = [name for name, value in ((DEMO_STUDENT_PASSWORD_ENV, student_password), (DEMO_ORGANIZER_PASSWORD_ENV, organizer_password)) if not value]
    if missing:
        raise SystemExit(f"Missing required environment variable(s): {', '.join(missing)}")
    from app.config import get_settings
    settings = get_settings()
    if settings.is_production and not args.confirm_production:
        raise SystemExit("Refusing to seed production without --confirm-production")

    with SessionLocal() as db:
        try:
            summary = seed_demo(db, student_password=student_password, organizer_password=organizer_password)
            db.commit()
        except Exception:
            db.rollback()
            raise
    print("CampusLoop demo seed complete")
    print(f"Demo student: {DEMO_STUDENT_EMAIL}")
    print("Demo organizers: nexus.demo@example.com, aperture.demo@example.com, rhythm.demo@example.com, velocity.demo@example.com, founders.demo@example.com")
    print(f"Created: {summary['created_users']} users, {summary['created_clubs']} clubs, {summary['created_events']} events, {summary['created_registrations']} registrations, {summary['created_saved_events']} saved events, {summary['created_notifications']} notifications")


if __name__ == "__main__":
    main()