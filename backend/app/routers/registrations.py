from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from ..dependencies import DatabaseSession, OrganizerUser, StudentUser
from ..models import Event, EventStatus, Registration
from ..schemas import (
    AttendeeList,
    AttendeeResponse,
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
    if existing_registration is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already registered for this event",
        )

    registration_count = (
        db.query(Registration)
        .filter(Registration.event_id == event.id)
        .count()
    )
    if registration_count >= event.capacity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event capacity has been reached",
        )

    registration = Registration(student_id=student_id, event_id=event.id)
    db.add(registration)
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
    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found",
        )

    response = RegistrationResponse.model_validate(registration)
    db.delete(registration)
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
    organizer: OrganizerUser,
    db: DatabaseSession,
):
    event = get_event_or_404(db, event_id)
    if event.organizer_id != organizer.id:
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
            student=registration.student,
        )
        for registration in registrations
    ]
    return AttendeeList(event=event, items=attendees, total=len(attendees))
