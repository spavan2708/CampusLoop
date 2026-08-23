from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from ..dependencies import CurrentUser, DatabaseSession
from ..models import Notification, NotificationPreference, NotificationStatus
from ..notifications import get_preferences
from ..schemas import (
    NotificationList,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    NotificationResponse,
    UnreadCountResponse,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def visible_query(db: DatabaseSession, user_id: int):
    return db.query(Notification).filter(
        Notification.recipient_user_id == user_id,
        Notification.archived_at.is_(None),
        Notification.status.in_([NotificationStatus.DELIVERED, NotificationStatus.READ]),
    )


@router.get("", response_model=NotificationList)
def list_notifications(
    current_user: CurrentUser,
    db: DatabaseSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    unread: bool | None = None,
    category: str | None = Query(default=None, max_length=40),
    notification_type: str | None = Query(default=None, alias="type", max_length=80),
):
    query = visible_query(db, current_user.id)
    if unread is True:
        query = query.filter(Notification.read_at.is_(None))
    elif unread is False:
        query = query.filter(Notification.read_at.is_not(None))
    if category:
        query = query.filter(Notification.category == category)
    if notification_type:
        query = query.filter(Notification.type == notification_type)
    total = query.count()
    items = query.order_by(Notification.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    first_seen = now_utc()
    changed = False
    for item in items:
        if item.seen_at is None:
            item.seen_at = first_seen
            changed = True
    if changed:
        db.commit()
    return NotificationList(items=items, total=total, page=page, limit=limit)


@router.get("/unread-count", response_model=UnreadCountResponse)
def unread_count(current_user: CurrentUser, db: DatabaseSession):
    return UnreadCountResponse(count=visible_query(db, current_user.id).filter(Notification.read_at.is_(None)).count())


def owned_notification(db: DatabaseSession, notification_id: int, user_id: int) -> Notification:
    item = db.query(Notification).filter_by(id=notification_id, recipient_user_id=user_id).first()
    if item is None or item.archived_at is not None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return item


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(notification_id: int, current_user: CurrentUser, db: DatabaseSession):
    item = owned_notification(db, notification_id, current_user.id)
    timestamp = now_utc()
    item.read_at = item.read_at or timestamp
    item.seen_at = item.seen_at or timestamp
    item.status = NotificationStatus.READ
    db.commit(); db.refresh(item)
    return item


@router.patch("/{notification_id}/unread", response_model=NotificationResponse)
def mark_unread(notification_id: int, current_user: CurrentUser, db: DatabaseSession):
    item = owned_notification(db, notification_id, current_user.id)
    item.read_at = None
    item.status = NotificationStatus.DELIVERED
    db.commit(); db.refresh(item)
    return item


@router.patch("/read-all", response_model=UnreadCountResponse)
def mark_all_read(current_user: CurrentUser, db: DatabaseSession):
    timestamp = now_utc()
    for item in visible_query(db, current_user.id).filter(Notification.read_at.is_(None)).all():
        item.read_at = timestamp
        item.seen_at = item.seen_at or timestamp
        item.status = NotificationStatus.READ
    db.commit()
    return UnreadCountResponse(count=0)


@router.delete("/{notification_id}", status_code=204)
def archive_notification(notification_id: int, current_user: CurrentUser, db: DatabaseSession):
    item = owned_notification(db, notification_id, current_user.id)
    item.archived_at = now_utc()
    db.commit()


@router.get("/preferences", response_model=NotificationPreferenceResponse)
def preferences(current_user: CurrentUser, db: DatabaseSession):
    item = get_preferences(db, current_user.id)
    db.commit(); db.refresh(item)
    return item


@router.patch("/preferences", response_model=NotificationPreferenceResponse)
def update_preferences(payload: NotificationPreferenceUpdate, current_user: CurrentUser, db: DatabaseSession):
    item = get_preferences(db, current_user.id)
    changes = payload.model_dump(exclude_unset=True)
    # Future providers remain disabled until a configured service and consent flow exist.
    changes["email_enabled"] = False
    changes["push_enabled"] = False
    for key, value in changes.items():
        setattr(item, key, value)
    db.commit(); db.refresh(item)
    return item
