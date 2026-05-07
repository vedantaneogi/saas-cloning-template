import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class CalendarCreate(BaseModel):
    name: str = "Calendar"
    color: str = "#0078D4"
    is_visible: bool = True


class CalendarUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    is_visible: Optional[bool] = None
    is_shared: Optional[bool] = None
    permission_level: Optional[str] = None


class CalendarOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    color: str
    is_default: bool
    is_shared: bool
    shared_by_user_id: Optional[uuid.UUID] = None
    permission_level: str
    is_visible: bool
    created_at: datetime
    updated_at: datetime


class EventAttendeeIn(BaseModel):
    email: str
    display_name: Optional[str] = None
    is_required: bool = True
    is_organizer: bool = False


class EventAttendeeOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    event_id: uuid.UUID
    email: str
    display_name: Optional[str] = None
    response_status: str
    is_organizer: bool
    is_required: bool
    proposed_new_time: Optional[dict[str, Any]] = None


class EventCreate(BaseModel):
    calendar_id: uuid.UUID
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: datetime
    all_day: bool = False
    is_recurring: bool = False
    recurrence_rule: Optional[dict[str, Any]] = None
    reminder_minutes: int = 15
    is_online_meeting: bool = False
    meeting_url: Optional[str] = None
    status: str = "busy"
    sensitivity: str = "normal"
    attendees: list[EventAttendeeIn] = []
    category_ids: Optional[list[uuid.UUID]] = None


class EventUpdate(BaseModel):
    calendar_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    all_day: Optional[bool] = None
    is_recurring: Optional[bool] = None
    recurrence_rule: Optional[dict[str, Any]] = None
    reminder_minutes: Optional[int] = None
    is_online_meeting: Optional[bool] = None
    meeting_url: Optional[str] = None
    status: Optional[str] = None
    sensitivity: Optional[str] = None
    attendees: Optional[list[EventAttendeeIn]] = None
    category_ids: Optional[list[uuid.UUID]] = None


class EventOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    calendar_id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: datetime
    all_day: bool
    is_recurring: bool
    recurrence_rule: Optional[dict[str, Any]] = None
    recurrence_parent_id: Optional[uuid.UUID] = None
    reminder_minutes: int
    is_online_meeting: bool
    meeting_url: Optional[str] = None
    status: str
    sensitivity: str
    created_at: datetime
    updated_at: datetime


class RespondRequest(BaseModel):
    response: str  # accepted | tentative | declined
    message: Optional[str] = None


class ProposeTimeRequest(BaseModel):
    start_time: datetime
    end_time: datetime
