"""Bounded, cron-friendly notification generation and delivery jobs."""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .models import (
    Event,
    EventStatus,
    Notification,
    NotificationChannel,
    NotificationDeliveryAttempt,
    NotificationOutbox,
    NotificationPreference,
    NotificationPriority,
    NotificationStatus,
    Registration,
    RegistrationStatus,
    SavedEvent,
)
from .notifications import create_notification, notify_admins, notify_club, utc_now


def in_window(target: datetime, now: datetime, hours: int, tolerance_minutes: int = 60) -> bool:
    start = now + timedelta(hours=hours)
    return start <= target < start + timedelta(minutes=tolerance_minutes)


def generate_reminders(db: Session, now: datetime | None = None) -> int:
    now = now or utc_now()
    created_before = db.query(Notification).count()
    published = db.query(Event).filter(Event.status == EventStatus.PUBLISHED).all()
    for event in published:
        if event.registration_deadline <= now or event.event_date <= now:
            continue
        registrations = {item.student_id: item for item in event.registrations if item.status != RegistrationStatus.CANCELLED}
        for saved in db.query(SavedEvent).filter_by(event_id=event.id).all():
            if saved.student_id in registrations:
                continue
            for hours in (72, 24):
                if in_window(event.registration_deadline, now, hours):
                    create_notification(db, recipient_user_id=saved.student_id, notification_type="SAVED_EVENT_REGISTRATION_REMINDER", category="saved_events", title="Registration closes soon", message=f"Registration for {event.title} closes in about {hours} hours.", action_url=f"/student/events/{event.id}", event_id=event.id, club_id=event.club_id, expires_at=event.registration_deadline, deduplication_key=f"user:{saved.student_id}:event:{event.id}:saved-reminder:{hours}h")
        for student_id, registration in registrations.items():
            for hours in (72, 24):
                if in_window(event.registration_deadline, now, hours):
                    create_notification(db, recipient_user_id=student_id, notification_type="REGISTRATION_DEADLINE_APPROACHING", category="registrations", title="Registration deadline approaching", message=f"Registration for {event.title} closes in about {hours} hours.", action_url="/student/registrations", event_id=event.id, club_id=event.club_id, expires_at=event.registration_deadline, deduplication_key=f"user:{student_id}:event:{event.id}:deadline:{hours}h")
            for hours in (24, 2):
                if in_window(event.event_date, now, hours):
                    create_notification(db, recipient_user_id=student_id, notification_type="EVENT_STARTING_SOON", category="event_reminders", title="Event starting soon", message=f"{event.title} starts in about {hours} hours at {event.venue}.", action_url=f"/student/events/{event.id}", event_id=event.id, club_id=event.club_id, expires_at=event.event_date, deduplication_key=f"user:{student_id}:event:{event.id}:starting:{hours}h", priority=NotificationPriority.HIGH if hours == 2 else NotificationPriority.NORMAL)
        for hours in (24, 2):
            if in_window(event.event_date, now, hours):
                notify_club(db, event.club_id, notification_type="EVENT_STARTING_SOON_CLUB", category="operations", title="Event starting soon", message=f"{event.title} starts in about {hours} hours. Review attendee and venue readiness.", action_url=f"/club/events/{event.id}", event_id=event.id, entity_type="event", entity_id=event.id, expires_at=event.event_date, deduplication_key=f"club:{event.club_id}:event:{event.id}:starting:{hours}h", priority=NotificationPriority.HIGH)
    risky = db.query(Event).filter(Event.status == EventStatus.PENDING_APPROVAL, Event.registration_deadline > now, Event.registration_deadline < now + timedelta(hours=24)).all()
    for event in risky:
        notify_admins(db, notification_type="EVENT_DEADLINE_RISK", category="moderation", title="Review deadline risk", message=f"{event.title} is awaiting review and registration closes within 24 hours.", action_url="/admin", event_id=event.id, club_id=event.club_id, entity_type="event", entity_id=event.id, deduplication_key=f"admin:event:{event.id}:deadline-risk", priority=NotificationPriority.URGENT)
    pending_count = db.query(Event).filter(Event.status == EventStatus.PENDING_APPROVAL).count()
    if pending_count >= 10:
        bucket = now.strftime("%Y-%m-%d")
        notify_admins(db, notification_type="REVIEW_QUEUE_GROWING", category="moderation", title="Review queue is growing", message=f"{pending_count} events are currently awaiting review.", action_url="/admin", entity_type="review_queue", entity_id=0, deduplication_key=f"admin:review-queue:{bucket}", priority=NotificationPriority.HIGH)
    generate_digests(db, now)
    db.commit()
    return db.query(Notification).count() - created_before


def generate_digests(db: Session, now: datetime) -> int:
    """Create one idempotent in-app summary per configured digest period."""
    created = 0
    for preference in db.query(NotificationPreference).filter(
        NotificationPreference.digest_frequency.in_(["daily", "weekly"]),
        NotificationPreference.in_app_enabled.is_(True),
    ):
        period = now.strftime("%Y-%m-%d")
        if preference.digest_frequency == "weekly":
            year, week, _ = now.isocalendar()
            period = f"{year}-W{week:02d}"
        unread = db.query(Notification).filter(
            Notification.recipient_user_id == preference.user_id,
            Notification.read_at.is_(None),
            Notification.archived_at.is_(None),
            Notification.status == NotificationStatus.DELIVERED,
            Notification.type != "NOTIFICATION_DIGEST",
        ).count()
        if unread and create_notification(
            db,
            recipient_user_id=preference.user_id,
            notification_type="NOTIFICATION_DIGEST",
            category="digest",
            title=f"Your {preference.digest_frequency} CampusLoop digest",
            message=f"You have {unread} unread CampusLoop update{'s' if unread != 1 else ''}.",
            action_url=None,
            deduplication_key=f"user:{preference.user_id}:digest:{preference.digest_frequency}:{period}",
            metadata={"unread_count": unread, "frequency": preference.digest_frequency},
        ):
            created += 1
    return created


def _is_obsolete(db: Session, item: Notification, event: Event | None, now: datetime) -> bool:
    if event and event.status == EventStatus.CANCELLED and item.type != "EVENT_CANCELLED":
        return True
    if item.type == "SAVED_EVENT_REGISTRATION_REMINDER":
        is_saved = db.query(SavedEvent).filter_by(student_id=item.recipient_user_id, event_id=item.event_id).first()
        is_registered = db.query(Registration).filter(
            Registration.student_id == item.recipient_user_id,
            Registration.event_id == item.event_id,
            Registration.status != RegistrationStatus.CANCELLED,
        ).first()
        return not is_saved or is_registered is not None
    if item.type in {"EVENT_STARTING_SOON", "REGISTRATION_DEADLINE_APPROACHING"}:
        active_registration = db.query(Registration).filter(
            Registration.student_id == item.recipient_user_id,
            Registration.event_id == item.event_id,
            Registration.status != RegistrationStatus.CANCELLED,
        ).first()
        return active_registration is None or (
            item.type == "REGISTRATION_DEADLINE_APPROACHING"
            and event is not None
            and event.registration_deadline <= now
        )
    return False


def deliver_due(db: Session, now: datetime | None = None, limit: int = 100) -> int:
    now = now or utc_now()
    candidate_ids = [row.id for row in db.query(Notification.id).filter(
        Notification.status == NotificationStatus.SCHEDULED,
        Notification.scheduled_for <= now,
    ).order_by(Notification.scheduled_for).limit(limit)]
    delivered = 0
    for notification_id in candidate_ids:
        claimed = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.status == NotificationStatus.SCHEDULED,
        ).update({Notification.status: NotificationStatus.PENDING}, synchronize_session=False)
        if claimed != 1:
            continue
        item = db.get(Notification, notification_id)
        event = db.get(Event, item.event_id) if item.event_id else None
        if item.expires_at and item.expires_at <= now:
            item.status = NotificationStatus.EXPIRED
        elif _is_obsolete(db, item, event, now):
            item.status = NotificationStatus.CANCELLED
        else:
            item.status = NotificationStatus.DELIVERED
            item.sent_at = now
            db.add(NotificationDeliveryAttempt(
                notification_id=item.id,
                channel=NotificationChannel.IN_APP,
                attempt_number=1,
                status="delivered",
                attempted_at=now,
            ))
            delivered += 1
    db.commit()
    return delivered


def expire_obsolete(db: Session, now: datetime | None = None) -> int:
    now = now or utc_now()
    items = db.query(Notification).filter(Notification.expires_at.is_not(None), Notification.expires_at <= now, Notification.status.in_([NotificationStatus.SCHEDULED, NotificationStatus.DELIVERED])).all()
    for item in items:
        item.status = NotificationStatus.EXPIRED
    db.commit()
    return len(items)


def process_outbox(db: Session, now: datetime | None = None, limit: int = 100, handler=None) -> int:
    """Process durable domain events with bounded exponential retry metadata."""
    if handler is None:
        raise RuntimeError("An outbox handler is required to process domain events")
    now = now or utc_now()
    items = db.query(NotificationOutbox).filter(
        NotificationOutbox.status.in_(["pending", "retry"]),
        NotificationOutbox.available_at <= now,
    ).order_by(NotificationOutbox.created_at).limit(limit).all()
    processed = 0
    for candidate in items:
        claimed = db.query(NotificationOutbox).filter(
            NotificationOutbox.id == candidate.id,
            NotificationOutbox.status.in_(["pending", "retry"]),
        ).update({NotificationOutbox.status: "processing", NotificationOutbox.locked_at: now}, synchronize_session=False)
        if claimed != 1:
            continue
        item = db.get(NotificationOutbox, candidate.id)
        item.locked_at = now
        item.attempts += 1
        try:
            handler(item)
            item.status = "processed"
            item.processed_at = now
            item.last_error = None
            processed += 1
        except Exception as exc:  # The durable record retains bounded retry state.
            item.last_error = str(exc)[:1000]
            item.status = "failed" if item.attempts >= 5 else "retry"
            item.available_at = now + timedelta(minutes=min(60, 2 ** item.attempts))
        finally:
            item.locked_at = None
    db.commit()
    return processed
