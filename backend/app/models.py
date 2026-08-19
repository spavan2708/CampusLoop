from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class UserRole(str, Enum):
    STUDENT = "student"
    ORGANIZER = "organizer"


class EventStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"


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

    created_events: Mapped[list["Event"]] = relationship(
        back_populates="organizer",
        cascade="all, delete-orphan"
    )

    registrations: Mapped[list["Registration"]] = relationship(
        back_populates="student",
        cascade="all, delete-orphan"
    )


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(150), index=True)
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(80))
    venue: Mapped[str] = mapped_column(String(150))
    event_date: Mapped[datetime] = mapped_column(DateTime)
    registration_deadline: Mapped[datetime] = mapped_column(DateTime)
    capacity: Mapped[int] = mapped_column(Integer)
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

    organizer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    organizer: Mapped["User"] = relationship(
        back_populates="created_events"
    )

    registrations: Mapped[list["Registration"]] = relationship(
        back_populates="event",
        cascade="all, delete-orphan"
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

    student: Mapped["User"] = relationship(
        back_populates="registrations"
    )

    event: Mapped["Event"] = relationship(
        back_populates="registrations"
    )
