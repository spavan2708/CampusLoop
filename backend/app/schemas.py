from datetime import datetime, timezone

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from .models import EventStatus, UserRole


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole

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

    @field_validator("title", "description", "category", "venue")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be blank")
        return value

    @field_validator("event_date", "registration_deadline")
    @classmethod
    def normalize_datetimes(cls, value: datetime) -> datetime:
        return normalize_datetime(value)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.event_date <= utc_now_naive():
            raise ValueError("Event date must be in the future")
        if self.registration_deadline >= self.event_date:
            raise ValueError("Registration deadline must be before the event")
        return self


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, min_length=1)
    category: str | None = Field(default=None, min_length=1, max_length=80)
    venue: str | None = Field(default=None, min_length=1, max_length=150)
    event_date: datetime | None = None
    registration_deadline: datetime | None = None
    capacity: int | None = Field(default=None, gt=0)

    @field_validator("title", "description", "category", "venue")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be blank")
        return value

    @field_validator("event_date", "registration_deadline")
    @classmethod
    def normalize_optional_datetimes(
        cls,
        value: datetime | None,
    ) -> datetime | None:
        return normalize_datetime(value) if value is not None else None

    @model_validator(mode="after")
    def reject_nulls_and_past_date(self):
        for field_name in self.model_fields_set:
            if getattr(self, field_name) is None:
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
    organizer_id: int
    organizer_name: str
    registered_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EventList(BaseModel):
    items: list[EventResponse]
    total: int


class RegistrationResponse(BaseModel):
    id: int
    student_id: int
    registered_at: datetime
    event: EventResponse

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
    student: AttendeeStudent


class AttendeeList(BaseModel):
    event: EventResponse
    items: list[AttendeeResponse]
    total: int
