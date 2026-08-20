from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from ..dependencies import ClubAdminUser, DatabaseSession, StudentUser
from ..models import ClubAdminMembership, Event, EventStatus, NotificationPriority, PaymentStatus, Registration, RegistrationStatus, SavedEvent
from ..notifications import create_notification, enqueue_domain_event, notify_club, utc_now
from ..schemas import (
    AttendeeList,
    AttendeeResponse,
    EventResponse,
    RegistrationList,
    RegistrationResponse,
    utc_now_naive,
)


router = APIRouter(prefix="/registrations", tags=["registrations"])


def get_event_or_404(db: DatabaseSession, event_id: int) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    return event


@router.post(
    "/events/{event_id}",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_for_event(
    event_id: int,
    student: StudentUser,
    db: DatabaseSession,
):
    student_id = student.id
    if db.get_bind().dialect.name == "sqlite":
        # Authentication has already opened a deferred read transaction. Restart
        # it as an immediate transaction so capacity checks and inserts serialize.
        db.rollback()
        db.execute(text("BEGIN IMMEDIATE"))

    event = (
        db.query(Event)
        .filter(Event.id == event_id)
        .with_for_update()
        .first()
    )
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    if event.status != EventStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only published events accept registrations",
        )
    if utc_now_naive() >= event.registration_deadline:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration deadline has passed",
        )

    existing_registration = (
        db.query(Registration)
        .filter(
            Registration.student_id == student_id,
            Registration.event_id == event.id,
        )
        .first()
    )
    if existing_registration is not None and existing_registration.status != RegistrationStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already registered for this event",
        )

    registration_count = (
        db.query(Registration)
        .filter(
            Registration.event_id == event.id,
            Registration.status.in_([
                RegistrationStatus.CONFIRMED,
                RegistrationStatus.PENDING_PAYMENT,
            ]),
        )
        .count()
    )
    is_waitlisted = registration_count >= event.capacity
    new_status = RegistrationStatus.WAITLISTED if is_waitlisted else (RegistrationStatus.PENDING_PAYMENT if event.is_paid else RegistrationStatus.CONFIRMED)
    registration = existing_registration or Registration(student_id=student_id, event_id=event.id)
    registration.status = new_status
    registration.payment_status = PaymentStatus.PENDING if event.is_paid and not is_waitlisted else PaymentStatus.NOT_REQUIRED
    registration.amount_paise = event.entry_fee_paise
    registration.registered_at = utc_now()
    db.add(registration)
    db.flush()
    notice_type = "WAITLIST_JOINED" if is_waitlisted else ("PAYMENT_PENDING" if event.is_paid else "REGISTRATION_CONFIRMED")
    copy = "You joined the waitlist." if is_waitlisted else ("Your place is pending payment. Online payment is not yet available. No payment has been collected." if event.is_paid else "Your registration is confirmed.")
    enqueue_domain_event(db, notice_type, "registration", registration.id or 0, {"event_id": event.id, "student_id": student_id}, f"student:{student_id}:event:{event.id}:{notice_type}:{registration.registered_at.isoformat()}")
    create_notification(db, recipient_user_id=student_id, notification_type=notice_type, category="payments" if event.is_paid else "registrations", title=f"{event.title}: {notice_type.replace('_', ' ').title()}", message=copy, action_url="/student/registrations", event_id=event.id, club_id=event.club_id, entity_type="registration", entity_id=registration.id, deduplication_key=f"user:{student_id}:event:{event.id}:{notice_type}:{registration.registered_at.isoformat()}", priority=NotificationPriority.HIGH)
    if is_waitlisted and db.query(Registration).filter(Registration.event_id == event.id, Registration.status == RegistrationStatus.WAITLISTED).count() == 0:
        notify_club(db, event.club_id, notification_type="WAITLIST_STARTED", category="registrations", title="Waitlist started", message=f"{event.title} has reached capacity and its waitlist has started.", action_url=f"/club/events/{event.id}/attendees", event_id=event.id, entity_type="event", entity_id=event.id, deduplication_key=f"club:{event.club_id}:event:{event.id}:waitlist-started", priority=NotificationPriority.HIGH)
    if not is_waitlisted:
        new_count = registration_count + 1
        old_percent = (registration_count * 100) // event.capacity
        new_percent = (new_count * 100) // event.capacity
        for milestone in (25, 50, 75, 90, 100):
            if old_percent < milestone <= new_percent:
                notify_club(db, event.club_id, notification_type="NEW_REGISTRATION_MILESTONE", category="registrations", title=f"{milestone}% registration milestone", message=f"{event.title} reached {new_count} of {event.capacity} registrations.", action_url=f"/club/events/{event.id}/attendees", event_id=event.id, entity_type="event", entity_id=event.id, deduplication_key=f"club:{event.club_id}:event:{event.id}:milestone:{milestone}")
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already registered for this event",
        )
    db.refresh(registration)
    return registration


@router.delete("/events/{event_id}", response_model=RegistrationResponse)
def cancel_registration(
    event_id: int,
    student: StudentUser,
    db: DatabaseSession,
):
    registration = (
        db.query(Registration)
        .filter(
            Registration.student_id == student.id,
            Registration.event_id == event_id,
        )
        .first()
    )
    if registration is None or registration.status == RegistrationStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found",
        )

    response = RegistrationResponse.model_validate(registration)
    released_spot = registration.status in (RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING_PAYMENT)
    registration.status = RegistrationStatus.CANCELLED
    registration.payment_status = PaymentStatus.NOT_REQUIRED
    create_notification(db, recipient_user_id=student.id, notification_type="REGISTRATION_CANCELLED", category="registrations", title="Registration cancelled", message=f"Your registration for {registration.event.title} was cancelled.", action_url="/student/registrations", event_id=registration.event_id, club_id=registration.event.club_id, entity_type="registration", entity_id=registration.id, deduplication_key=f"user:{student.id}:registration:{registration.id}:cancelled:{utc_now().isoformat()}")
    enqueue_domain_event(db, "REGISTRATION_CANCELLED", "registration", registration.id, {"event_id": event_id, "student_id": student.id}, f"registration:{registration.id}:cancelled:{utc_now().isoformat()}")
    if released_spot:
        promoted = db.query(Registration).filter(Registration.event_id == event_id, Registration.status == RegistrationStatus.WAITLISTED).order_by(Registration.registered_at.asc()).first()
        if promoted:
            promoted.status = RegistrationStatus.PENDING_PAYMENT if registration.event.is_paid else RegistrationStatus.CONFIRMED
            promoted.payment_status = PaymentStatus.PENDING if registration.event.is_paid else PaymentStatus.NOT_REQUIRED
            create_notification(db, recipient_user_id=promoted.student_id, notification_type="WAITLIST_PROMOTED", category="registrations", title="You’re off the waitlist", message=f"A place opened for {registration.event.title}. Your registration is now {'pending payment' if registration.event.is_paid else 'confirmed'}.", action_url="/student/registrations", event_id=event_id, club_id=registration.event.club_id, entity_type="registration", entity_id=promoted.id, deduplication_key=f"user:{promoted.student_id}:registration:{promoted.id}:promoted", priority=NotificationPriority.URGENT)
    db.commit()
    return response


@router.get("/me", response_model=RegistrationList)
def list_my_registrations(student: StudentUser, db: DatabaseSession):
    registrations = (
        db.query(Registration)
        .filter(Registration.student_id == student.id)
        .order_by(Registration.registered_at.desc())
        .all()
    )
    return RegistrationList(items=registrations, total=len(registrations))


@router.get("/events/{event_id}/attendees", response_model=AttendeeList)
def list_event_attendees(
    event_id: int,
    organizer: ClubAdminUser,
    db: DatabaseSession,
):
    event = get_event_or_404(db, event_id)
    membership = db.query(ClubAdminMembership).filter(ClubAdminMembership.user_id == organizer.id, ClubAdminMembership.club_id == event.club_id).first()
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this event",
        )

    registrations = (
        db.query(Registration)
        .filter(Registration.event_id == event.id)
        .order_by(Registration.registered_at.asc())
        .all()
    )
    attendees = [
        AttendeeResponse(
            registration_id=registration.id,
            registered_at=registration.registered_at,
            status=registration.status,
            payment_status=registration.payment_status,
            amount_paise=registration.amount_paise,
            student=registration.student,
        )
        for registration in registrations
    ]
    return AttendeeList(event=event, items=attendees, total=len(attendees))


@router.post("/events/{event_id}/save", status_code=status.HTTP_201_CREATED)
def save_event(event_id: int, student: StudentUser, db: DatabaseSession):
    event = db.query(Event).filter(Event.id == event_id, Event.status == EventStatus.PUBLISHED).first()
    if not event: raise HTTPException(status_code=404, detail="Event not found")
    if db.query(SavedEvent).filter_by(student_id=student.id, event_id=event_id).first():
        raise HTTPException(status_code=409, detail="Event already saved")
    db.add(SavedEvent(student_id=student.id, event_id=event_id)); db.commit()
    return {"saved": True, "event_id": event_id}


@router.delete("/events/{event_id}/save")
def unsave_event(event_id: int, student: StudentUser, db: DatabaseSession):
    item = db.query(SavedEvent).filter_by(student_id=student.id, event_id=event_id).first()
    if not item: raise HTTPException(status_code=404, detail="Saved event not found")
    db.delete(item); db.commit(); return {"saved": False, "event_id": event_id}


@router.get("/saved", response_model=list[EventResponse])
def saved_events(student: StudentUser, db: DatabaseSession):
    return [item.event for item in db.query(SavedEvent).filter_by(student_id=student.id).all()]
