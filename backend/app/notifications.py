"""Notification creation, preferences, domain outbox, and reminder eligibility."""
from datetime import datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.orm import Session

from .models import (
    ClubAdminMembership,
    Notification,
    NotificationChannel,
    NotificationOutbox,
    NotificationPreference,
    NotificationPriority,
    NotificationStatus,
    User,
    UserRole,
)

ESSENTIAL_TYPES = {
    "EVENT_CANCELLED",
    "REGISTRATION_CONFIRMED",
    "REGISTRATION_CANCELLED",
    "WAITLIST_PROMOTED",
    "EVENT_RESCHEDULED",
}
ALLOWED_ACTION_PREFIXES = ("/student", "/club", "/admin")


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def safe_action_url(value: str | None) -> str | None:
    if value is None:
        return None
    if "://" in value or not any(
        value == prefix or value.startswith(f"{prefix}/")
        for prefix in ALLOWED_ACTION_PREFIXES
    ):
        raise ValueError("Notification action URLs must be internal portal paths")
    return value


def get_preferences(db: Session, user_id: int) -> NotificationPreference:
    preference = db.query(NotificationPreference).filter_by(user_id=user_id).first()
    if preference is None:
        preference = NotificationPreference(user_id=user_id)
        db.add(preference)
        db.flush()
    return preference


def preference_allows(db: Session, user_id: int, notification_type: str, category: str) -> bool:
    if notification_type in ESSENTIAL_TYPES:
        return True
    preference = get_preferences(db, user_id)
    return preference.in_app_enabled and preference.category_settings.get(category, True) is not False


def quiet_hours_delivery(preference: NotificationPreference, now: datetime) -> datetime | None:
    if not preference.quiet_hours_start or not preference.quiet_hours_end:
        return None
    try:
        zone = ZoneInfo(preference.timezone)
        local_now = now.replace(tzinfo=timezone.utc).astimezone(zone)
        start = time.fromisoformat(preference.quiet_hours_start)
        end = time.fromisoformat(preference.quiet_hours_end)
    except (ValueError, ZoneInfoNotFoundError):
        return None
    current = local_now.time().replace(tzinfo=None)
    active = start <= current < end if start < end else current >= start or current < end
    if not active:
        return None
    delivery_date = local_now.date()
    if start >= end and current >= start:
        delivery_date += timedelta(days=1)
    local_delivery = datetime.combine(delivery_date, end, tzinfo=zone)
    return local_delivery.astimezone(timezone.utc).replace(tzinfo=None)


def create_notification(
    db: Session,
    *,
    recipient_user_id: int,
    notification_type: str,
    category: str,
    title: str,
    message: str,
    deduplication_key: str,
    action_url: str | None = None,
    event_id: int | None = None,
    club_id: int | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    scheduled_for: datetime | None = None,
    expires_at: datetime | None = None,
    metadata: dict[str, Any] | None = None,
) -> Notification | None:
    if not preference_allows(db, recipient_user_id, notification_type, category):
        return None
    existing = db.query(Notification).filter_by(deduplication_key=deduplication_key).first()
    if existing:
        return existing
    now = utc_now()
    if notification_type not in ESSENTIAL_TYPES and priority != NotificationPriority.URGENT:
        quiet_delivery = quiet_hours_delivery(get_preferences(db, recipient_user_id), now)
        if quiet_delivery and (scheduled_for is None or quiet_delivery > scheduled_for):
            scheduled_for = quiet_delivery
    scheduled = scheduled_for is not None and scheduled_for > now
    item = Notification(
        recipient_user_id=recipient_user_id,
        type=notification_type,
        category=category,
        title=title[:180],
        message=message,
        action_url=safe_action_url(action_url),
        event_id=event_id,
        club_id=club_id,
        entity_type=entity_type,
        entity_id=entity_id,
        priority=priority,
        channel=NotificationChannel.IN_APP,
        status=NotificationStatus.SCHEDULED if scheduled else NotificationStatus.DELIVERED,
        scheduled_for=scheduled_for,
        sent_at=None if scheduled else now,
        expires_at=expires_at,
        deduplication_key=deduplication_key,
        metadata_json=metadata or {},
    )
    db.add(item)
    return item


def enqueue_domain_event(
    db: Session,
    event_name: str,
    aggregate_type: str,
    aggregate_id: int,
    payload: dict[str, Any],
    deduplication_key: str,
) -> None:
    if db.query(NotificationOutbox).filter_by(deduplication_key=deduplication_key).first():
        return
    db.add(NotificationOutbox(
        event_name=event_name,
        aggregate_type=aggregate_type,
        aggregate_id=aggregate_id,
        payload=payload,
        deduplication_key=deduplication_key,
        status="pending",
    ))


def club_admin_ids(db: Session, club_id: int) -> list[int]:
    return [row.user_id for row in db.query(ClubAdminMembership).filter_by(club_id=club_id).all()]


def central_admin_ids(db: Session) -> list[int]:
    return [row.id for row in db.query(User).filter(User.role == UserRole.CENTRAL_ADMIN, User.is_active.is_(True)).all()]


def notify_club(db: Session, club_id: int, **kwargs: Any) -> None:
    for user_id in club_admin_ids(db, club_id):
        user_kwargs = dict(kwargs)
        user_kwargs["deduplication_key"] = f"{kwargs['deduplication_key']}:user:{user_id}"
        create_notification(db, recipient_user_id=user_id, club_id=club_id, **user_kwargs)


def notify_admins(db: Session, **kwargs: Any) -> None:
    for user_id in central_admin_ids(db):
        user_kwargs = dict(kwargs)
        user_kwargs["deduplication_key"] = f"{kwargs['deduplication_key']}:user:{user_id}"
        create_notification(db, recipient_user_id=user_id, **user_kwargs)


class EmailService:
    enabled = False

    def send(self, *_args: Any, **_kwargs: Any) -> None:
        return None


class PushNotificationService:
    enabled = False

    def send(self, *_args: Any, **_kwargs: Any) -> None:
        return None
