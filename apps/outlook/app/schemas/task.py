import uuid
from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel


class TaskStep(BaseModel):
    id: str
    title: str
    is_completed: bool = False


class TaskListCreate(BaseModel):
    name: str
    color: Optional[str] = None
    sort_order: int = 0


class TaskListUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None


class TaskListOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    is_default: bool
    color: Optional[str] = None
    sort_order: int
    created_at: datetime


class TaskCreate(BaseModel):
    title: str
    body: Optional[str] = None
    due_date: Optional[date] = None
    reminder_at: Optional[datetime] = None
    importance: str = "normal"
    list_id: Optional[uuid.UUID] = None
    source_message_id: Optional[uuid.UUID] = None
    parent_task_id: Optional[uuid.UUID] = None
    recurrence_rule: Optional[dict[str, Any]] = None
    sort_order: int = 0


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    due_date: Optional[date] = None
    reminder_at: Optional[datetime] = None
    importance: Optional[str] = None
    list_id: Optional[uuid.UUID] = None
    parent_task_id: Optional[uuid.UUID] = None
    recurrence_rule: Optional[dict[str, Any]] = None
    sort_order: Optional[int] = None
    is_completed: Optional[bool] = None
    steps: Optional[list[TaskStep]] = None


class TaskOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    list_id: Optional[uuid.UUID] = None
    title: str
    body: Optional[str] = None
    is_completed: bool
    completed_at: Optional[datetime] = None
    due_date: Optional[date] = None
    reminder_at: Optional[datetime] = None
    importance: str
    steps: list[TaskStep] = []
    source_message_id: Optional[uuid.UUID] = None
    parent_task_id: Optional[uuid.UUID] = None
    recurrence_rule: Optional[dict[str, Any]] = None
    sort_order: int
    created_at: datetime
    updated_at: datetime
