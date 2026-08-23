from app.models import ApprovalStatus, Club, Event, EventStatus, PaymentStatus, Registration, RegistrationStatus, SavedEvent, User, UserRole
from app.security import verify_password
from seed_demo import DEMO_STUDENT_EMAIL, CLUBS, seed_demo


def test_demo_seed_is_idempotent_and_uses_valid_demo_states(db_session):
    first = seed_demo(db_session, student_password="demo-student-password", organizer_password="demo-organizer-password")
    db_session.commit()
    second = seed_demo(db_session, student_password="demo-student-password", organizer_password="demo-organizer-password")
    db_session.commit()

    assert first["created_users"] == 6
    assert first["created_clubs"] == 5
    assert first["created_events"] == 10
    assert second["created_users"] == 0
    assert second["created_clubs"] == 0
    assert second["created_events"] == 0
    assert db_session.query(User).count() == 6
    assert db_session.query(Club).count() == 5
    assert db_session.query(Event).count() == 10
    assert db_session.query(Registration).count() == 4
    assert db_session.query(SavedEvent).count() == 3

    student = db_session.query(User).filter_by(email=DEMO_STUDENT_EMAIL).one()
    assert student.role == UserRole.STUDENT
    assert verify_password("demo-student-password", student.password_hash)
    assert db_session.query(User).filter(User.role == UserRole.CLUB_ADMIN).count() == 5
    assert all(club.approval_status == ApprovalStatus.APPROVED and club.is_active for club in db_session.query(Club).all())
    assert all(event.status == EventStatus.PUBLISHED and event.is_published and event.event_date > event.registration_deadline for event in db_session.query(Event).all())
    registrations = db_session.query(Registration).filter_by(student_id=student.id).all()
    assert {item.status for item in registrations} == {RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING_PAYMENT, RegistrationStatus.WAITLISTED}
    pending = next(item for item in registrations if item.status == RegistrationStatus.PENDING_PAYMENT)
    assert pending.payment_status == PaymentStatus.PENDING
    assert not any(item.payment_status == PaymentStatus.PAID for item in registrations)
    assert len(CLUBS) == 5
    assert db_session.query(User).filter(User.email.like("%@demo.campusloop.invalid")).count() == 6
