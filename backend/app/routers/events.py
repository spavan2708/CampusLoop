from datetime import date, datetime, time, timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Query as SqlAlchemyQuery

from ..dependencies import DatabaseSession, OrganizerUser
from ..models import Event, EventStatus
from ..schemas import (
    EventCreate,
    EventList,
    EventResponse,
    EventUpdate,
    utc_now_naive,
)


router = APIRouter(prefix="/events", tags=["events"])


def event_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Event not found",
    )


def get_owned_event(db: DatabaseSession, event_id: int, organizer_id: int) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise event_not_found()
    if event.organizer_id != organizer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this event",
        )
    return event


def validate_event_dates(event_date: datetime, registration_deadline: datetime):
    if event_date <= utc_now_naive():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Event date must be in the future",
        )
    if registration_deadline >= event_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Registration deadline must be before the event",
        )


def apply_filters(
    query: SqlAlchemyQuery,
    title: str | None,
    category: str | None,
    event_day: date | None,
) -> SqlAlchemyQuery:
    if title:
        query = query.filter(Event.title.ilike(f"%{title.strip()}%"))
    if category:
        query = query.filter(func.lower(Event.category) == category.strip().lower())
    if event_day:
        day_start = datetime.combine(event_day, time.min)
        query = query.filter(
            Event.event_date >= day_start,
            Event.event_date < day_start + timedelta(days=1),
        )
    return query


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    organizer: OrganizerUser,
    db: DatabaseSession,
):
    event = Event(
        **payload.model_dump(),
        organizer_id=organizer.id,
        status=EventStatus.DRAFT,
        is_published=False,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/mine", response_model=EventList)
def list_my_events(
    organizer: OrganizerUser,
    db: DatabaseSession,
    title: str | None = None,
    category: str | None = None,
    event_day: Annotated[date | None, Query(alias="date")] = None,
):
    query = db.query(Event).filter(Event.organizer_id == organizer.id)
    query = apply_filters(query, title, category, event_day)
    items = query.order_by(Event.event_date.asc()).all()
    return EventList(items=items, total=len(items))


@router.patch("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    payload: EventUpdate,
    organizer: OrganizerUser,
    db: DatabaseSession,
):
    event = get_owned_event(db, event_id, organizer.id)
    if event.status == EventStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cancelled events cannot be modified",
        )

    changes = payload.model_dump(exclude_unset=True)
    event_date = changes.get("event_date", event.event_date)
    registration_deadline = changes.get(
        "registration_deadline",
        event.registration_deadline,
    )
    validate_event_dates(event_date, registration_deadline)
    for field_name, value in changes.items():
        setattr(event, field_name, value)

    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/publish", response_model=EventResponse)
def publish_event(
    event_id: int,
    organizer: OrganizerUser,
    db: DatabaseSession,
):
    event = get_owned_event(db, event_id, organizer.id)
    if event.status == EventStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cancelled events cannot be published",
        )
    validate_event_dates(event.event_date, event.registration_deadline)
    event.status = EventStatus.PUBLISHED
    event.is_published = True
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/cancel", response_model=EventResponse)
def cancel_event(
    event_id: int,
    organizer: OrganizerUser,
    db: DatabaseSession,
):
    event = get_owned_event(db, event_id, organizer.id)
    event.status = EventStatus.CANCELLED
    event.is_published = False
    db.commit()
    db.refresh(event)
    return event


@router.get("", response_model=EventList)
def list_published_events(
    db: DatabaseSession,
    title: str | None = None,
    category: str | None = None,
    event_day: Annotated[date | None, Query(alias="date")] = None,
):
    query = db.query(Event).filter(Event.status == EventStatus.PUBLISHED)
    query = apply_filters(query, title, category, event_day)
    items = query.order_by(Event.event_date.asc()).all()
    return EventList(items=items, total=len(items))


@router.get("/{event_id}", response_model=EventResponse)
def get_published_event(event_id: int, db: DatabaseSession):
    event = (
        db.query(Event)
        .filter(
            Event.id == event_id,
            Event.status == EventStatus.PUBLISHED,
        )
        .first()
    )
    if event is None:
        raise event_not_found()
    return event
