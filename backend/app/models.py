from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class UserRole(str, Enum):
    STUDENT = "student"
    CLUB_ADMIN = "club_admin"
    ORGANIZER = "club_admin"  # Python compatibility alias for pre-redesign imports.
    CENTRAL_ADMIN = "central_admin"


class EventStatus(str, Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    CHANGES_REQUESTED = "changes_requested"
    APPROVED = "approved"
    PUBLISHED = "published"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class PaymentStatus(str, Enum):
    NOT_REQUIRED = "not_required"
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class RegistrationStatus(str, Enum):
    CONFIRMED = "confirmed"
    PENDING_PAYMENT = "pending_payment"
    WAITLISTED = "waitlisted"
    CANCELLED = "cancelled"


class NotificationStatus(str, Enum):
    SCHEDULED = "scheduled"
    PENDING = "pending"
    DELIVERED = "delivered"
    READ = "read"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    FAILED = "failed"


class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class NotificationChannel(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    PUSH = "push"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        SqlEnum(UserRole),
        default=UserRole.STUDENT
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    club_memberships: Mapped[list["ClubAdminMembership"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    registrations: Mapped[list["Registration"]] = relationship(
        back_populates="student",
        cascade="all, delete-orphan"
    )
    saved_events: Mapped[list["SavedEvent"]] = relationship(
        back_populates="student",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list["Notification"]] = relationship(back_populates="recipient", cascade="all, delete-orphan")
    notification_preferences: Mapped["NotificationPreference | None"] = relationship(back_populates="user", cascade="all, delete-orphan", uselist=False)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(150), index=True)
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(80))
    venue: Mapped[str] = mapped_column(String(150))
    event_date: Mapped[datetime] = mapped_column(DateTime)
    end_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    registration_deadline: Mapped[datetime] = mapped_column(DateTime)
    capacity: Mapped[int] = mapped_column(Integer)
    tags: Mapped[str] = mapped_column(Text, default="")
    eligibility: Mapped[str] = mapped_column(Text, default="Open to all students")
    instructions: Mapped[str] = mapped_column(Text, default="")
    contact_details: Mapped[str] = mapped_column(String(255), default="")
    external_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    poster_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    entry_fee_paise: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Kept for compatibility with the prototype database created in Phase 1.
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[EventStatus] = mapped_column(
        SqlEnum(EventStatus),
        default=EventStatus.DRAFT,
        server_default=EventStatus.DRAFT.name,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"))
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    # Legacy Phase 2 databases still require this column. New ownership checks use
    # club_id/created_by_id, but keeping it populated lets upgraded databases work
    # without deleting or rebuilding development data.
    organizer_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    club: Mapped["Club"] = relationship(back_populates="events")
    created_by: Mapped["User"] = relationship(foreign_keys=[created_by_id])

    registrations: Mapped[list["Registration"]] = relationship(
        back_populates="event",
        cascade="all, delete-orphan"
    )
    saved_by: Mapped[list["SavedEvent"]] = relationship(
        back_populates="event",
        cascade="all, delete-orphan",
    )

    @property
    def organizer_name(self) -> str:
        return self.club.name

    @property
    def registered_count(self) -> int:
        return sum(
            registration.status
            in (RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING_PAYMENT)
            for registration in self.registrations
        )

    @property
    def waitlist_count(self) -> int:
        return sum(
            registration.status == RegistrationStatus.WAITLISTED
            for registration in self.registrations
        )


class Registration(Base):
    __tablename__ = "registrations"

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "event_id",
            name="unique_student_event"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id")
    )

    registered_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )
    status: Mapped[RegistrationStatus] = mapped_column(SqlEnum(RegistrationStatus), default=RegistrationStatus.CONFIRMED)
    payment_status: Mapped[PaymentStatus] = mapped_column(SqlEnum(PaymentStatus), default=PaymentStatus.NOT_REQUIRED)
    amount_paise: Mapped[int] = mapped_column(Integer, default=0)
    transaction_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)

    student: Mapped["User"] = relationship(
        back_populates="registrations"
    )

    event: Mapped["Event"] = relationship(
        back_populates="registrations"
    )


class Club(Base):
    __tablename__ = "clubs"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    category: Mapped[str] = mapped_column(String(80))
    contact_email: Mapped[str] = mapped_column(String(255))
    faculty_coordinator: Mapped[str] = mapped_column(String(150))
    student_coordinator: Mapped[str] = mapped_column(String(150))
    approval_status: Mapped[ApprovalStatus] = mapped_column(SqlEnum(ApprovalStatus), default=ApprovalStatus.PENDING)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    memberships: Mapped[list["ClubAdminMembership"]] = relationship(back_populates="club", cascade="all, delete-orphan")
    events: Mapped[list["Event"]] = relationship(back_populates="club", cascade="all, delete-orphan")


class ClubAdminMembership(Base):
    __tablename__ = "club_admin_memberships"
    __table_args__ = (UniqueConstraint("user_id", "club_id", name="unique_club_admin"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    user: Mapped["User"] = relationship(back_populates="club_memberships")
    club: Mapped["Club"] = relationship(back_populates="memberships")


class EventReview(Base):
    __tablename__ = "event_reviews"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"))
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(40))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class SavedEvent(Base):
    __tablename__ = "saved_events"
    __table_args__ = (UniqueConstraint("student_id", "event_id", name="unique_saved_event"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    student: Mapped["User"] = relationship(back_populates="saved_events")
    event: Mapped["Event"] = relationship(back_populates="saved_by")


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_recipient_status", "recipient_user_id", "status"),
        Index("ix_notifications_recipient_created", "recipient_user_id", "created_at"),
        Index("ix_notifications_schedule", "status", "scheduled_for"),
        Index("ix_notifications_expires", "expires_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    recipient_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(80), index=True)
    category: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(180))
    message: Mapped[str] = mapped_column(Text)
    action_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    entity_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    event_id: Mapped[int | None] = mapped_column(ForeignKey("events.id"), nullable=True)
    club_id: Mapped[int | None] = mapped_column(ForeignKey("clubs.id"), nullable=True)
    priority: Mapped[NotificationPriority] = mapped_column(SqlEnum(NotificationPriority), default=NotificationPriority.NORMAL)
    channel: Mapped[NotificationChannel] = mapped_column(SqlEnum(NotificationChannel), default=NotificationChannel.IN_APP)
    status: Mapped[NotificationStatus] = mapped_column(SqlEnum(NotificationStatus), default=NotificationStatus.PENDING)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    seen_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    deduplication_key: Mapped[str] = mapped_column(String(255), unique=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    recipient: Mapped["User"] = relationship(back_populates="notifications")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    timezone: Mapped[str] = mapped_column(String(80), default="Asia/Kolkata")
    quiet_hours_start: Mapped[str | None] = mapped_column(String(5), nullable=True)
    quiet_hours_end: Mapped[str | None] = mapped_column(String(5), nullable=True)
    digest_frequency: Mapped[str] = mapped_column(String(20), default="instant")
    in_app_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    push_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    category_settings: Mapped[dict] = mapped_column(JSON, default=dict)
    reminder_timings: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    user: Mapped["User"] = relationship(back_populates="notification_preferences")


class NotificationOutbox(Base):
    __tablename__ = "notification_outbox"
    __table_args__ = (Index("ix_notification_outbox_work", "status", "available_at"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    event_name: Mapped[str] = mapped_column(String(100))
    aggregate_type: Mapped[str] = mapped_column(String(40))
    aggregate_id: Mapped[int] = mapped_column(Integer)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    deduplication_key: Mapped[str] = mapped_column(String(255), unique=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    locked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class NotificationDeliveryAttempt(Base):
    __tablename__ = "notification_delivery_attempts"
    id: Mapped[int] = mapped_column(primary_key=True)
    notification_id: Mapped[int] = mapped_column(ForeignKey("notifications.id"))
    channel: Mapped[NotificationChannel] = mapped_column(SqlEnum(NotificationChannel))
    attempt_number: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20))
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempted_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
