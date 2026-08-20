from datetime import datetime, timezone

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from .models import ApprovalStatus, EventStatus, NotificationChannel, NotificationPriority, NotificationStatus, PaymentStatus, RegistrationStatus, UserRole


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @model_validator(mode="after")
    def passwords_must_differ(self):
        if self.current_password == self.new_password:
            raise ValueError("New password must be different")
        return self


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


def normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(min_length=1)
    category: str = Field(min_length=1, max_length=80)
    venue: str = Field(min_length=1, max_length=150)
    event_date: datetime
    registration_deadline: datetime
    capacity: int = Field(gt=0)
    end_date: datetime | None = None
    tags: str = ""
    eligibility: str = "Open to all students"
    instructions: str = ""
    contact_details: str = ""
    external_link: str | None = None
    is_paid: bool = False
    entry_fee_paise: int = Field(default=0, ge=0)

    @field_validator("title", "description", "category", "venue")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be blank")
        return value

    @field_validator("event_date", "registration_deadline", "end_date")
    @classmethod
    def normalize_datetimes(cls, value: datetime | None) -> datetime | None:
        return normalize_datetime(value) if value is not None else None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.event_date <= utc_now_naive():
            raise ValueError("Event date must be in the future")
        if self.registration_deadline >= self.event_date:
            raise ValueError("Registration deadline must be before the event")
        if self.end_date is not None and self.end_date <= self.event_date:
            raise ValueError("End date must be after the event starts")
        if self.is_paid and self.entry_fee_paise <= 0:
            raise ValueError("Paid events require a positive fee")
        if not self.is_paid:
            self.entry_fee_paise = 0
        return self


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, min_length=1)
    category: str | None = Field(default=None, min_length=1, max_length=80)
    venue: str | None = Field(default=None, min_length=1, max_length=150)
    event_date: datetime | None = None
    registration_deadline: datetime | None = None
    capacity: int | None = Field(default=None, gt=0)
    end_date: datetime | None = None
    tags: str | None = None
    eligibility: str | None = None
    instructions: str | None = None
    contact_details: str | None = None
    external_link: str | None = None
    is_paid: bool | None = None
    entry_fee_paise: int | None = Field(default=None, ge=0)

    @field_validator("title", "description", "category", "venue")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be blank")
        return value

    @field_validator("event_date", "registration_deadline", "end_date")
    @classmethod
    def normalize_optional_datetimes(
        cls,
        value: datetime | None,
    ) -> datetime | None:
        return normalize_datetime(value) if value is not None else None

    @model_validator(mode="after")
    def reject_nulls_and_past_date(self):
        for field_name in self.model_fields_set:
            if getattr(self, field_name) is None and field_name not in {"end_date", "external_link"}:
                raise ValueError(f"{field_name} cannot be null")
        if self.event_date is not None and self.event_date <= utc_now_naive():
            raise ValueError("Event date must be in the future")
        return self


class EventResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    venue: str
    event_date: datetime
    registration_deadline: datetime
    capacity: int
    status: EventStatus
    club_id: int
    created_by_id: int
    organizer_name: str
    registered_count: int
    waitlist_count: int
    created_at: datetime
    end_date: datetime | None
    tags: str
    eligibility: str
    instructions: str
    contact_details: str
    external_link: str | None
    poster_url: str | None
    banner_url: str | None
    is_paid: bool
    entry_fee_paise: int
    currency: str
    is_featured: bool
    cancellation_reason: str | None

    model_config = ConfigDict(from_attributes=True)


class EventList(BaseModel):
    items: list[EventResponse]
    total: int


class RegistrationResponse(BaseModel):
    id: int
    student_id: int
    registered_at: datetime
    event: EventResponse
    status: RegistrationStatus
    payment_status: PaymentStatus
    amount_paise: int
    transaction_reference: str | None

    model_config = ConfigDict(from_attributes=True)


class RegistrationList(BaseModel):
    items: list[RegistrationResponse]
    total: int


class AttendeeStudent(BaseModel):
    id: int
    name: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


class AttendeeResponse(BaseModel):
    registration_id: int
    registered_at: datetime
    status: RegistrationStatus
    payment_status: PaymentStatus
    amount_paise: int
    student: AttendeeStudent


class AttendeeList(BaseModel):
    event: EventResponse
    items: list[AttendeeResponse]
    total: int


class ClubApplicationRequest(BaseModel):
    club_name: str = Field(min_length=2, max_length=150)
    description: str = Field(min_length=10)
    category: str = Field(min_length=2, max_length=80)
    contact_email: EmailStr
    faculty_coordinator: str = Field(min_length=2, max_length=150)
    student_coordinator: str = Field(min_length=2, max_length=150)
    admin_name: str = Field(min_length=2, max_length=100)
    admin_email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AdminClubCreateRequest(ClubApplicationRequest):
    """Club profile and its initial login, supplied only by central administration."""


class ClubResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str
    logo_url: str | None
    banner_url: str | None
    category: str
    contact_email: EmailStr
    faculty_coordinator: str
    student_coordinator: str
    approval_status: ApprovalStatus
    rejection_reason: str | None
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ClubUpdateRequest(BaseModel):
    description: str | None = Field(default=None, min_length=10)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    contact_email: EmailStr | None = None
    faculty_coordinator: str | None = Field(default=None, min_length=2, max_length=150)
    student_coordinator: str | None = Field(default=None, min_length=2, max_length=150)

    @field_validator("description", "category", "faculty_coordinator", "student_coordinator")
    @classmethod
    def strip_profile_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("contact_email")
    @classmethod
    def normalize_contact_email(cls, value: EmailStr | None) -> str | None:
        return str(value).strip().lower() if value is not None else None


class AdminClubStatusRequest(BaseModel):
    is_active: bool


class ModerationRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=2000)


class EventReviewResponse(BaseModel):
    id: int
    event_id: int
    reviewer_id: int
    action: str
    reason: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationResponse(BaseModel):
    id: int
    type: str
    category: str
    title: str
    message: str
    action_url: str | None
    entity_type: str | None
    entity_id: int | None
    event_id: int | None
    club_id: int | None
    priority: NotificationPriority
    channel: NotificationChannel
    status: NotificationStatus
    read_at: datetime | None
    seen_at: datetime | None
    scheduled_for: datetime | None
    sent_at: datetime | None
    expires_at: datetime | None
    metadata: dict = Field(default_factory=dict, validation_alias="metadata_json")
    created_at: datetime
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class NotificationList(BaseModel):
    items: list[NotificationResponse]
    total: int
    page: int
    limit: int


class UnreadCountResponse(BaseModel):
    count: int


class NotificationPreferenceResponse(BaseModel):
    timezone: str
    quiet_hours_start: str | None
    quiet_hours_end: str | None
    digest_frequency: str
    in_app_enabled: bool
    email_enabled: bool
    push_enabled: bool
    category_settings: dict
    reminder_timings: dict
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class NotificationPreferenceUpdate(BaseModel):
    timezone: str | None = Field(default=None, min_length=1, max_length=80)
    quiet_hours_start: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    quiet_hours_end: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    digest_frequency: str | None = Field(default=None, pattern=r"^(instant|daily|weekly)$")
    in_app_enabled: bool | None = None
    email_enabled: bool | None = None
    push_enabled: bool | None = None
    category_settings: dict[str, bool] | None = None
    reminder_timings: dict[str, list[int]] | None = None
