import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[uuid.UUID] = None
    icon: Optional[str] = None
    sort_order: int = 0


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None
    parent_id: Optional[uuid.UUID] = None


class FolderOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    slug: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    is_system: bool
    icon: Optional[str] = None
    sort_order: int
    unread_count: int
    total_count: int
    created_at: datetime
    updated_at: datetime
