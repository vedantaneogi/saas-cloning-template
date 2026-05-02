import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class EmailAddress(BaseModel):
    email: str
    name: Optional[str] = None


class AttachmentOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    message_id: uuid.UUID
    filename: str
    content_type: str
    size_bytes: int
    storage_path: Optional[str] = None
    is_inline: bool
    created_at: datetime


class MessageCreate(BaseModel):
    folder_id: Optional[uuid.UUID] = None
    conversation_id: Optional[uuid.UUID] = None
    to_addresses: list[dict[str, Any]] = []
    cc_addresses: list[dict[str, Any]] = []
    bcc_addresses: list[dict[str, Any]] = []
    subject: str = ""
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    importance: str = "normal"
    sensitivity: str = "normal"
    is_draft: bool = False
    is_flagged: bool = False
    scheduled_send_at: Optional[datetime] = None
    signature_id: Optional[uuid.UUID] = None


class MessageUpdate(BaseModel):
    folder_id: Optional[uuid.UUID] = None
    is_read: Optional[bool] = None
    is_flagged: Optional[bool] = None
    is_pinned: Optional[bool] = None
    importance: Optional[str] = None
    sensitivity: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    snooze_until: Optional[datetime] = None
    scheduled_send_at: Optional[datetime] = None
    category_ids: Optional[list[uuid.UUID]] = None


class CategoryOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    color: str


class MessageOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    conversation_id: Optional[uuid.UUID] = None
    folder_id: uuid.UUID
    from_address: str
    from_name: Optional[str] = None
    to_addresses: list[Any]
    cc_addresses: list[Any]
    bcc_addresses: list[Any]
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    is_read: bool
    is_flagged: bool
    is_pinned: bool
    is_draft: bool
    importance: str
    sensitivity: str
    has_attachments: bool
    in_reply_to_id: Optional[uuid.UUID] = None
    reply_type: str
    snooze_until: Optional[datetime] = None
    scheduled_send_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    categories: list[CategoryOut] = []


class MessageList(BaseModel):
    items: list[MessageOut]
    next_cursor: Optional[str] = None
    total_count: int


class ReplyRequest(BaseModel):
    body_html: str
    reply_all: bool = False
    cc_addresses: list[dict[str, Any]] = []


class ForwardRequest(BaseModel):
    to_addresses: list[dict[str, Any]]
    cc_addresses: list[dict[str, Any]] = []
    body_html: str = ""


class MoveRequest(BaseModel):
    folder_id: uuid.UUID


class BulkRequest(BaseModel):
    message_ids: list[uuid.UUID]
    action: str  # mark_read, mark_unread, delete, move, flag, unflag, categorize
    params: Optional[dict[str, Any]] = None


class SweepKeepLatestRequest(BaseModel):
    sender_email: str
    folder_id: Optional[uuid.UUID] = None  # None = search all folders


class SweepMoveAllRequest(BaseModel):
    sender_email: str
    target_folder_id: uuid.UUID
    source_folder_id: Optional[uuid.UUID] = None  # None = all folders


class CleanUpThreadRequest(BaseModel):
    conversation_id: uuid.UUID
