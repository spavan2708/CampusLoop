from fastapi import APIRouter, HTTPException

from ..dependencies import CentralAdminUser, DatabaseSession
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from ..models import ApprovalStatus, Club, ClubAdminMembership, Event, EventReview, EventStatus, NotificationPriority, User, UserRole
from ..notifications import create_notification, enqueue_domain_event, notify_club, utc_now
from ..schemas import AdminClubCreateRequest, AdminClubStatusRequest, ClubResponse, EventList, EventResponse, EventReviewResponse, ModerationRequest, UserResponse
from ..security import hash_password
from .clubs import slugify
from .events import validate_event_dates

router = APIRouter(prefix="/admin", tags=["central administration"])


@router.post("/clubs", response_model=ClubResponse, status_code=201)
def create_club_with_login(payload: AdminClubCreateRequest, admin: CentralAdminUser, db: DatabaseSession):
    club = Club(
        name=payload.club_name.strip(), slug=slugify(payload.club_name),
        description=payload.description.strip(), category=payload.category.strip(),
        contact_email=str(payload.contact_email).lower(),
        faculty_coordinator=payload.faculty_coordinator.strip(),
        student_coordinator=payload.student_coordinator.strip(),
        approval_status=ApprovalStatus.APPROVED, is_active=True,
    )
    club_admin = User(
        name=payload.admin_name.strip(), email=str(payload.admin_email).lower(),
        password_hash=hash_password(payload.password), role=UserRole.CLUB_ADMIN, is_active=True,
    )
    db.add_all([club, club_admin])
    try:
        db.flush()
        db.add(ClubAdminMembership(user_id=club_admin.id, club_id=club.id))
        enqueue_domain_event(db, "CLUB_CREATED", "club", club.id, {"club_id": club.id, "user_id": club_admin.id}, f"club:{club.id}:created")
        create_notification(db, recipient_user_id=admin.id, notification_type="CLUB_CREATED", category="club_activity", title="Club account created", message=f"{club.name} and its club-admin login were created.", action_url="/admin", club_id=club.id, entity_type="club", entity_id=club.id, deduplication_key=f"admin:{admin.id}:club:{club.id}:created")
        create_notification(db, recipient_user_id=club_admin.id, notification_type="CLUB_CREATED", category="club_activity", title="Welcome to CampusLoop", message=f"Your {club.name} publishing account is ready. Change your temporary password after signing in.", action_url="/club/profile", club_id=club.id, entity_type="club", entity_id=club.id, deduplication_key=f"club-user:{club_admin.id}:created", priority=NotificationPriority.HIGH)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Club name, slug, or login email already exists") from exc
    db.refresh(club)
    return club


@router.get("/clubs", response_model=list[ClubResponse])
def list_all_clubs(admin: CentralAdminUser, db: DatabaseSession, approval_status: ApprovalStatus | None = None):
    query = db.query(Club)
    if approval_status:
        query = query.filter(Club.approval_status == approval_status)
    return query.order_by(Club.created_at.desc()).all()


@router.get("/clubs/{club_id}", response_model=ClubResponse)
def get_club(club_id: int, admin: CentralAdminUser, db: DatabaseSession):
    club = db.get(Club, club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club


@router.patch("/clubs/{club_id}/status", response_model=ClubResponse)
def set_club_status(club_id: int, payload: AdminClubStatusRequest, admin: CentralAdminUser, db: DatabaseSession):
    club = db.get(Club, club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    club.is_active = payload.is_active
    for membership in club.memberships:
        membership.user.is_active = payload.is_active
    db.commit()
    db.refresh(club)
    return club


@router.get("/events", response_model=EventList)
def list_all_events(admin: CentralAdminUser, db: DatabaseSession, event_status: EventStatus | None = None):
    query = db.query(Event)
    if event_status:
        query = query.filter(Event.status == event_status)
    items = query.order_by(Event.created_at.desc()).all()
    return EventList(items=items, total=len(items))


@router.get("/events/{event_id}", response_model=EventResponse)
def get_event(event_id: int, admin: CentralAdminUser, db: DatabaseSession):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.get("/users", response_model=list[UserResponse])
def list_users(
    admin: CentralAdminUser,
    db: DatabaseSession,
    role: UserRole | None = None,
    is_active: bool | None = None,
    search: str | None = None,
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active.is_(is_active))
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(or_(User.name.ilike(term), User.email.ilike(term)))
    return query.order_by(User.created_at.desc()).all()


@router.get("/events/{event_id}/reviews", response_model=list[EventReviewResponse])
def event_review_history(event_id: int, admin: CentralAdminUser, db: DatabaseSession):
    if not db.get(Event, event_id):
        raise HTTPException(status_code=404, detail="Event not found")
    return db.query(EventReview).filter(EventReview.event_id == event_id).order_by(EventReview.created_at).all()


@router.post("/events/{event_id}/{action}", response_model=EventResponse)
def moderate_event(event_id: int, action: str, payload: ModerationRequest, admin: CentralAdminUser, db: DatabaseSession):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    transitions = {
        "approve": EventStatus.APPROVED,
        "reject": EventStatus.REJECTED,
        "request-changes": EventStatus.CHANGES_REQUESTED,
        "publish": EventStatus.PUBLISHED,
        "cancel": EventStatus.CANCELLED,
    }
    if action not in transitions:
        raise HTTPException(status_code=404, detail="Unknown moderation action")
    if action in {"approve", "reject", "request-changes"} and event.status != EventStatus.PENDING_APPROVAL:
        raise HTTPException(status_code=409, detail="Event is not pending approval")
    if action == "publish" and event.status != EventStatus.APPROVED:
        raise HTTPException(status_code=409, detail="Only approved events can be published")
    if action == "publish":
        validate_event_dates(event.event_date, event.registration_deadline)
    if action in {"reject", "request-changes", "cancel"} and not payload.reason:
        raise HTTPException(status_code=422, detail="A reason is required")
    event.status = transitions[action]
    event.is_published = action == "publish"
    if action == "cancel":
        event.cancellation_reason = payload.reason
    db.add(EventReview(event_id=event.id, reviewer_id=admin.id, action=action, reason=payload.reason))
    notice_type = {"approve": "EVENT_APPROVED", "reject": "EVENT_REJECTED", "request-changes": "EVENT_CHANGES_REQUESTED", "publish": "EVENT_PUBLISHED", "cancel": "EVENT_CANCELLED_BY_ADMIN"}[action]
    reason = f" Reason: {payload.reason}" if payload.reason else ""
    enqueue_domain_event(db, notice_type, "event", event.id, {"event_id": event.id, "club_id": event.club_id}, f"event:{event.id}:{notice_type}:{utc_now().isoformat()}")
    notify_club(db, event.club_id, notification_type=notice_type, category="moderation", title=notice_type.replace("EVENT_", "").replace("_", " ").title(), message=f"{event.title}: {action.replace('-', ' ')}.{reason}", action_url=f"/club/events/{event.id}", event_id=event.id, entity_type="event", entity_id=event.id, deduplication_key=f"club:{event.club_id}:event:{event.id}:{notice_type}:{utc_now().isoformat()}", priority=NotificationPriority.URGENT if action in {"reject", "request-changes", "cancel"} else NotificationPriority.HIGH)
    if action == "cancel":
        for registration in event.registrations:
            create_notification(db, recipient_user_id=registration.student_id, notification_type="EVENT_CANCELLED", category="event_updates", title="Event cancelled", message=f"{event.title} was cancelled by central administration.{reason}", action_url=f"/student/events/{event.id}", event_id=event.id, club_id=event.club_id, deduplication_key=f"user:{registration.student_id}:event:{event.id}:admin-cancelled", priority=NotificationPriority.URGENT)
    db.commit(); db.refresh(event); return event


@router.post("/events/{event_id}/feature", response_model=EventResponse)
def toggle_feature(event_id: int, admin: CentralAdminUser, db: DatabaseSession):
    event = db.get(Event, event_id)
    if not event or event.status != EventStatus.PUBLISHED:
        raise HTTPException(status_code=409, detail="Only published events can be featured")
    event.is_featured = not event.is_featured
    if event.is_featured:
        for student in db.query(User).filter(User.role == UserRole.STUDENT, User.is_active.is_(True)).all():
            create_notification(db, recipient_user_id=student.id, notification_type="EVENT_FEATURED", category="discovery", title="Featured campus event", message=f"{event.title} is now featured.", action_url=f"/student/events/{event.id}", event_id=event.id, club_id=event.club_id, deduplication_key=f"user:{student.id}:event:{event.id}:featured")
    db.commit(); db.refresh(event); return event
