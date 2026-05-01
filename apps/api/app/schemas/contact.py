import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class ContactCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    address: Optional[dict[str, Any]] = None
    notes: Optional[str] = None
    avatar_url: Optional[str] = None
    is_favorite: bool = False
    world_id: Optional[str] = None


class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    address: Optional[dict[str, Any]] = None
    notes: Optional[str] = None
    avatar_url: Optional[str] = None
    is_favorite: Optional[bool] = None


class ContactOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    world_id: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    display_name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    address: Optional[dict[str, Any]] = None
    notes: Optional[str] = None
    avatar_url: Optional[str] = None
    is_favorite: bool
    created_at: datetime
    updated_at: datetime
