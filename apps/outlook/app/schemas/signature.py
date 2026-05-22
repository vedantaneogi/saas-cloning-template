import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SignatureCreate(BaseModel):
    name: str
    body_html: str
    is_default_new: bool = False
    is_default_reply: bool = False


class SignatureUpdate(BaseModel):
    name: Optional[str] = None
    body_html: Optional[str] = None
    is_default_new: Optional[bool] = None
    is_default_reply: Optional[bool] = None


class SignatureOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    body_html: str
    is_default_new: bool
    is_default_reply: bool
    created_at: datetime
    updated_at: datetime
