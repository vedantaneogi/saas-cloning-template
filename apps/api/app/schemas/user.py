import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    world_id: str
    email: str
    display_name: str
    avatar_url: Optional[str] = None
    timezone: str
    locale: str
    role: str
    is_active: bool
    out_of_office_enabled: bool
    out_of_office_start: Optional[datetime] = None
    out_of_office_end: Optional[datetime] = None
    out_of_office_message_internal: Optional[str] = None
    out_of_office_message_external: Optional[str] = None
    created_at: datetime
    updated_at: datetime
