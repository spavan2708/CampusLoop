from datetime import date, datetime, time, timedelta
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Query as SqlAlchemyQuery

from ..dependencies import CentralAdminUser, ClubAdminUser, DatabaseSession
from ..models import ApprovalStatus, ClubAdminMembership, Event, EventReview, EventStatus, NotificationPriority, Registration, SavedEvent, User, UserRole
from ..models import Club
from ..notifications import create_notification, enqueue_domain_event, notify_admins, notify_club
from ..schemas import (
    EventCreate,
    EventList,
    EventResponse,
    EventUpdate,
    utc_now_naive,
)
from ..storage import storage


router = APIRouter(prefix="/events", tags=["events"])


def event_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Event not found",
    )


def public_event_query(query: SqlAlchemyQuery) -> SqlAlchemyQuery:
    return query.filter(
        Event.status == EventStatus.PUBLISHED,
        Event.club.has(approval_status=ApprovalStatus.APPROVED, is_active=True),
    )


def admin_club_id(db: DatabaseSession, user_id: int) -> int:
    membership = db.query(ClubAdminMembership).filter(ClubAdminMembership.user_id == user_id).first()
    if not membership or membership.club.approval_status != ApprovalStatus.APPROVED or not membership.club.is_active:
        raise HTTPException(status_code=403, detail="An approved active club is required")
    return membership.club_id


def get_owned_event(db: DatabaseSession, event_id: int, user_id: int) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise event_not_found()
    if event.club_id != admin_club_id(db, user_id):
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
    free: bool | None = None,
    club_id: int | None = None,
    sort: str | None = None,
    club_name: str | None = None,
) -> SqlAlchemyQuery:
    valid_sorts = {"newest", "soonest"}
    if sort and sort not in valid_sorts:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid sort value. Use 'newest' or 'soonest'",
        )
    if title:
        query = query.join(Event.club).filter(
            or_(
                Event.title.ilike(f"%{title.strip()}%"),
                Club.name.ilike(f"%{title.strip()}%"),
            )
        )
    if club_name:
        query = query.join(Event.club).filter(Club.name.ilike(f"%{club_name.strip()}%"))
    if category:
        query = query.filter(func.lower(Event.category) == category.strip().lower())
    if event_day:
        day_start = datetime.combine(event_day, time.min)
        query = query.filter(
            Event.event_date >= day_start,
            Event.event_date < day_start + timedelta(days=1),
        )
    if free is not None:
        if free:
            query = query.filter(Event.is_paid == False)
        else:
            query = query.filter(Event.is_paid == True)
    if club_id is not None:
        query = query.filter(Event.club_id == club_id)
    if sort == "newest":
        query = query.order_by(Event.created_at.desc())
    elif sort == "soonest":
        query = query.order_by(Event.event_date.asc())
    else:
        query = query.order_by(Event.event_date.asc())
    return query


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    organizer: ClubAdminUser,
    db: DatabaseSession,
):
    event = Event(
        **payload.model_dump(),
        club_id=admin_club_id(db, organizer.id),
        created_by_id=organizer.id,
        organizer_id=organizer.id,
        status=EventStatus.DRAFT,
        is_published=False,
    )
    db.add(event)
    db.flush()
    enqueue_domain_event(db, "EVENT_CREATED", "event", event.id, {"event_id": event.id, "club_id": event.club_id}, f"event:{event.id}:created")
    db.commit()
    db.refresh(event)
    return event


@router.get("/mine", response_model=EventList)
def list_my_events(
    organizer: ClubAdminUser,
    db: DatabaseSession,
    title: str | None = None,
    category: str | None = None,
    date: Annotated[date | None, Query(alias="date")] = None,
    free: bool | None = None,
    sort: str | None = None,
):
    query = db.query(Event).filter(Event.club_id == admin_club_id(db, organizer.id))
    query = apply_filters(query, title, category, date, free=free, sort=sort)
    items = query.all()
    return EventList(items=items, total=len(items))


@router.patch("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    payload: EventUpdate,
    organizer: ClubAdminUser,
    db: DatabaseSession,
):
    event = get_owned_event(db, event_id, organizer.id)
    if event.status not in (EventStatus.DRAFT, EventStatus.REJECTED, EventStatus.CHANGES_REQUESTED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft, rejected, or changes-requested events can be modified",
        )

    changes = payload.model_dump(exclude_unset=True)
    previous = {key: getattr(event, key) for key in changes}
    event_date = changes.get("event_date", event.event_date)
    registration_deadline = changes.get(
        "registration_deadline",
        event.registration_deadline,
    )
    validate_event_dates(event_date, registration_deadline)
    end_date = changes.get("end_date", event.end_date)
    if end_date is not None and end_date <= event_date:
        raise HTTPException(status_code=422, detail="End date must be after the event starts")
    is_paid = changes.get("is_paid", event.is_paid)
    entry_fee = changes.get("entry_fee_paise", event.entry_fee_paise)
    if is_paid and entry_fee <= 0:
        raise HTTPException(status_code=422, detail="Paid events require a positive fee")
    if not is_paid:
        changes["entry_fee_paise"] = 0
    for field_name, value in changes.items():
        setattr(event, field_name, value)

    if changes:
        enqueue_domain_event(db, "EVENT_UPDATED", "event", event.id, {"event_id": event.id, "fields": sorted(changes)}, f"event:{event.id}:updated:{event.updated_at if hasattr(event, 'updated_at') else utc_now_naive().isoformat()}")
        material = [key for key in ("event_date", "end_date", "venue", "registration_deadline") if key in changes and changes[key] != previous[key]]
        if material and event.status == EventStatus.PUBLISHED:
            recipient_ids = {row.student_id for row in db.query(Registration).filter_by(event_id=event.id).all()}
            recipient_ids.update(row.student_id for row in db.query(SavedEvent).filter_by(event_id=event.id).all())
            notice_type = "EVENT_RESCHEDULED" if "event_date" in material else "EVENT_UPDATED"
            for user_id in recipient_ids:
                create_notification(db, recipient_user_id=user_id, notification_type=notice_type, category="event_updates", title=f"{event.title} was updated", message=f"Updated details: {', '.join(field.replace('_', ' ') for field in material)}.", action_url=f"/student/events/{event.id}", event_id=event.id, club_id=event.club_id, deduplication_key=f"user:{user_id}:event:{event.id}:{notice_type}:{utc_now_naive().isoformat()}", priority=NotificationPriority.HIGH)

    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/submit", response_model=EventResponse)
def submit_event(
    event_id: int,
    organizer: ClubAdminUser,
    db: DatabaseSession,
):
    event = get_owned_event(db, event_id, organizer.id)
    if event.status not in (EventStatus.DRAFT, EventStatus.REJECTED, EventStatus.CHANGES_REQUESTED):
        raise HTTPException(status_code=409, detail="Event cannot be submitted in its current state")
    validate_event_dates(event.event_date, event.registration_deadline)
    event.status = EventStatus.PENDING_APPROVAL
    event.is_published = False
    enqueue_domain_event(db, "EVENT_SUBMITTED", "event", event.id, {"event_id": event.id, "club_id": event.club_id}, f"event:{event.id}:submitted:{utc_now_naive().isoformat()}")
    notify_club(db, event.club_id, notification_type="EVENT_SUBMITTED", category="moderation", title="Event submitted", message=f"{event.title} is awaiting central review.", action_url=f"/club/events/{event.id}", event_id=event.id, entity_type="event", entity_id=event.id, deduplication_key=f"club:{event.club_id}:event:{event.id}:submitted:{utc_now_naive().isoformat()}")
    notify_admins(db, notification_type="EVENT_AWAITING_REVIEW", category="moderation", title="Event awaiting review", message=f"{event.title} was submitted by {event.organizer_name}.", action_url="/admin", event_id=event.id, club_id=event.club_id, entity_type="event", entity_id=event.id, deduplication_key=f"admin:event:{event.id}:awaiting:{utc_now_naive().isoformat()}", priority=NotificationPriority.HIGH)
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/cancel", response_model=EventResponse)
def cancel_event(
    event_id: int,
    organizer: ClubAdminUser,
    db: DatabaseSession,
):
    event = get_owned_event(db, event_id, organizer.id)
    event.status = EventStatus.CANCELLED
    event.is_published = False
    enqueue_domain_event(db, "EVENT_CANCELLED", "event", event.id, {"event_id": event.id, "club_id": event.club_id}, f"event:{event.id}:club-cancelled:{utc_now_naive().isoformat()}")
    notify_club(db, event.club_id, notification_type="EVENT_CANCELLED", category="event_updates", title="Event cancelled", message=f"{event.title} has been cancelled.", action_url=f"/club/events/{event.id}", event_id=event.id, entity_type="event", entity_id=event.id, deduplication_key=f"club:{event.club_id}:event:{event.id}:cancelled:{utc_now_naive().isoformat()}", priority=NotificationPriority.URGENT)
    for registration in event.registrations:
        create_notification(db, recipient_user_id=registration.student_id, notification_type="EVENT_CANCELLED", category="event_updates", title="Event cancelled", message=f"{event.title} has been cancelled by the club.", action_url=f"/student/events/{event.id}", event_id=event.id, club_id=event.club_id, deduplication_key=f"user:{registration.student_id}:event:{event.id}:cancelled", priority=NotificationPriority.URGENT)
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/poster", response_model=EventResponse)
async def upload_poster(event_id: int, organizer: ClubAdminUser, db: DatabaseSession, image: UploadFile = File(...)):
    event = get_owned_event(db, event_id, organizer.id)
    storage.set_upload_context("event", event.id)
    try: event.poster_url = storage.save_image(await image.read(), image.content_type or "")
    except ValueError as exc: raise HTTPException(status_code=422, detail=str(exc)) from exc
    storage.clear_upload_context()
    db.commit(); db.refresh(event); return event


@router.post("/{event_id}/banner", response_model=EventResponse)
async def upload_banner(event_id: int, organizer: ClubAdminUser, db: DatabaseSession, image: UploadFile = File(...)):
    event = get_owned_event(db, event_id, organizer.id)
    storage.set_upload_context("event", event.id)
    try:
        event.banner_url = storage.save_image(await image.read(), image.content_type or "")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    storage.clear_upload_context()
    db.commit()
    db.refresh(event)
    return event


@router.get("", response_model=EventList)
def list_published_events(
    db: DatabaseSession,
    title: str | None = None,
    category: str | None = None,
    date: Annotated[date | None, Query(alias="date")] = None,
    free: bool | None = None,
    club: int | None = None,
    sort: str | None = None,
):
    query = public_event_query(db.query(Event))
    if date is None:
        query = query.filter(Event.event_date >= utc_now_naive())
    query = apply_filters(query, title, category, date, free=free, club_id=club, sort=sort)
    items = query.all()
    return EventList(items=items, total=len(items))


@router.get("/{event_id}", response_model=EventResponse)
def get_published_event(event_id: int, db: DatabaseSession):
    event = public_event_query(db.query(Event).filter(Event.id == event_id)).first()
    if event is None:
        raise event_not_found()
    return event


@router.post("/{event_id}/review/{action}", response_model=EventResponse)
def review_event(event_id: int, action: str, payload: dict, admin: CentralAdminUser, db: DatabaseSession):
    event = db.get(Event, event_id)
    if not event: raise event_not_found()
    mapping = {"approve": EventStatus.APPROVED, "reject": EventStatus.REJECTED, "request-changes": EventStatus.CHANGES_REQUESTED, "publish": EventStatus.PUBLISHED, "cancel": EventStatus.CANCELLED}
    if action not in mapping: raise HTTPException(status_code=404, detail="Unknown review action")
    if action in ("approve", "reject", "request-changes") and event.status != EventStatus.PENDING_APPROVAL:
        raise HTTPException(status_code=409, detail="Event is not pending approval")
    if action == "publish" and event.status != EventStatus.APPROVED:
        raise HTTPException(status_code=409, detail="Only approved events can be published")
    reason = payload.get("reason")
    if action in ("reject", "request-changes", "cancel") and not reason:
        raise HTTPException(status_code=422, detail="A reason is required")
    event.status = mapping[action]; event.is_published = action == "publish"
    if action == "cancel": event.cancellation_reason = reason
    db.add(EventReview(event_id=event.id, reviewer_id=admin.id, action=action, reason=reason))
    notification_types = {"approve": "EVENT_APPROVED", "reject": "EVENT_REJECTED", "request-changes": "EVENT_CHANGES_REQUESTED", "publish": "EVENT_PUBLISHED", "cancel": "EVENT_CANCELLED_BY_ADMIN"}
    notice_type = notification_types[action]
    details = f" Reason: {reason}" if reason else ""
    notify_club(db, event.club_id, notification_type=notice_type, category="moderation", title=notice_type.replace("EVENT_", "").replace("_", " ").title(), message=f"{event.title}: {action.replace('-', ' ')}.{details}", action_url=f"/club/events/{event.id}", event_id=event.id, entity_type="event", entity_id=event.id, deduplication_key=f"club:{event.club_id}:event:{event.id}:{notice_type}:{utc_now_naive().isoformat()}", priority=NotificationPriority.URGENT if action in ("reject", "request-changes", "cancel") else NotificationPriority.HIGH)
    if action == "cancel":
        for registration in event.registrations:
            create_notification(db, recipient_user_id=registration.student_id, notification_type="EVENT_CANCELLED", category="event_updates", title="Event cancelled", message=f"{event.title} was cancelled by central administration.{details}", action_url=f"/student/events/{event.id}", event_id=event.id, club_id=event.club_id, deduplication_key=f"user:{registration.student_id}:event:{event.id}:admin-cancelled", priority=NotificationPriority.URGENT)
    db.commit(); db.refresh(event); return event


@router.post("/{event_id}/feature", response_model=EventResponse)
def feature_event(event_id: int, admin: CentralAdminUser, db: DatabaseSession):
    event = db.get(Event, event_id)
    if not event or event.status != EventStatus.PUBLISHED: raise HTTPException(status_code=409, detail="Only published events can be featured")
    event.is_featured = True
    for student in db.query(User).filter(User.role == UserRole.STUDENT, User.is_active.is_(True)).all():
        create_notification(db, recipient_user_id=student.id, notification_type="EVENT_FEATURED", category="discovery", title="Featured campus event", message=f"{event.title} is now featured.", action_url=f"/student/events/{event.id}", event_id=event.id, club_id=event.club_id, deduplication_key=f"user:{student.id}:event:{event.id}:featured")
    db.commit(); db.refresh(event); return event
