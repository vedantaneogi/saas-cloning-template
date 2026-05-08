import uuid
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from app.envelopes.models import (
    EnvelopeStatus,
    FieldType,
    RecipientRole,
    RecipientStatus,
)


# ── Field Schemas ─────────────────────────────────────────────────────────────

class FieldCreate(BaseModel):
    recipient_id: uuid.UUID
    type: FieldType
    page: int = 1
    x: float = 0.0
    y: float = 0.0
    width: float = 100.0
    height: float = 40.0
    required: bool = True
    label: Optional[str] = None
    value: Optional[str] = None
    conditional_on: Optional[str] = None
    conditional_value: Optional[str] = None
    conditional_action: Optional[str] = None
    formula: Optional[str] = None
    decimal_places: Optional[int] = None


class FieldBulkItem(BaseModel):
    """A single field in a bulk-save payload (PUT /envelopes/{id}/fields)."""

    id: Optional[uuid.UUID] = None  # present for updates, absent for creates
    document_id: uuid.UUID
    recipient_id: uuid.UUID
    type: FieldType
    page: int = 1
    x: float = 0.0
    y: float = 0.0
    width: float = 100.0
    height: float = 40.0
    required: bool = True
    label: Optional[str] = None
    value: Optional[str] = None
    conditional_on: Optional[str] = None
    conditional_value: Optional[str] = None
    conditional_action: Optional[str] = None
    formula: Optional[str] = None
    decimal_places: Optional[int] = None


class FieldBulkSaveRequest(BaseModel):
    """Body for PUT /envelopes/{id}/fields — replaces all fields on the envelope."""

    fields: List[FieldBulkItem]


class FieldUpdate(BaseModel):
    type: Optional[FieldType] = None
    page: Optional[int] = None
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    required: Optional[bool] = None
    value: Optional[str] = None
    label: Optional[str] = None
    conditional_on: Optional[str] = None
    conditional_value: Optional[str] = None
    conditional_action: Optional[str] = None
    formula: Optional[str] = None
    decimal_places: Optional[int] = None


class FieldResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    recipient_id: uuid.UUID
    type: FieldType
    page: int
    x: float
    y: float
    width: float
    height: float
    required: bool
    value: Optional[str] = None
    label: Optional[str] = None
    conditional_on: Optional[str] = None
    conditional_value: Optional[str] = None
    conditional_action: Optional[str] = None
    formula: Optional[str] = None
    decimal_places: Optional[int] = None


# ── Recipient Schemas ─────────────────────────────────────────────────────────

class RecipientCreate(BaseModel):
    name: str = ""
    email: str = ""
    role: RecipientRole = RecipientRole.signer
    routing_order: int = 1
    access_code: Optional[str] = None
    private_message: Optional[str] = None


class RecipientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[RecipientRole] = None
    routing_order: Optional[int] = None
    access_code: Optional[str] = None
    private_message: Optional[str] = None


class RecipientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    envelope_id: uuid.UUID
    name: str
    email: str
    role: RecipientRole
    routing_order: int
    status: RecipientStatus
    signing_token: Optional[str] = None
    signed_at: Optional[datetime] = None
    declined_at: Optional[datetime] = None
    decline_reason: Optional[str] = None
    access_code: Optional[str] = None
    private_message: Optional[str] = None
    template_role_label: Optional[str] = None
    fields: List[FieldResponse] = []


# ── Document Schemas ──────────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    envelope_id: uuid.UUID
    filename: str
    original_filename: str
    page_count: int
    file_size: int = 0
    order: int
    created_at: datetime
    fields: List[FieldResponse] = []


# ── Envelope Schemas ──────────────────────────────────────────────────────────

class EnvelopeCreate(BaseModel):
    subject: str
    message: Optional[str] = None
    expires_at: Optional[datetime] = None
    reminder_days: int = 0
    allow_comments: Optional[bool] = None
    responsive_signing: Optional[bool] = None
    allow_reassign: Optional[bool] = None
    category: Optional[str] = None


class EnvelopeUpdate(BaseModel):
    subject: Optional[str] = None
    message: Optional[str] = None
    expires_at: Optional[datetime] = None
    reminder_days: Optional[int] = None
    allow_comments: Optional[bool] = None
    responsive_signing: Optional[bool] = None
    allow_reassign: Optional[bool] = None
    category: Optional[str] = None


class EnvelopeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: int
    subject: str
    message: Optional[str] = None
    status: EnvelopeStatus
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None
    reminder_days: int = 0
    sent_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    allow_comments: bool = True
    responsive_signing: bool = True
    allow_reassign: bool = True
    category: Optional[str] = None


class EnvelopeDetailResponse(EnvelopeResponse):
    documents: List[DocumentResponse] = []
    recipients: List[RecipientResponse] = []
    from_name: Optional[str] = None
    from_email: Optional[str] = None


class RecipientSummary(BaseModel):
    """Lightweight recipient info for list views (no nested fields)."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    role: RecipientRole
    routing_order: int
    status: RecipientStatus
    signing_token: Optional[str] = None
    signed_at: Optional[datetime] = None


class EnvelopeListItem(EnvelopeResponse):
    """Envelope with recipients included for list views (e.g. sign button)."""
    recipients: List[RecipientSummary] = []
    from_name: Optional[str] = None
    from_email: Optional[str] = None


class EnvelopeListResponse(BaseModel):
    items: List[EnvelopeListItem]
    total: int
    page: int
    page_size: int
    pages: int = 1


# ── Save as Template Schemas ──────────────────────────────────────────────────

class SaveAsTemplateRequest(BaseModel):
    name: Optional[str] = None
    role_labels: Optional[dict[str, str]] = None


class SaveAsTemplateResponse(BaseModel):
    template_id: uuid.UUID


# ── Void / Decline Schemas ────────────────────────────────────────────────────

class VoidEnvelopeRequest(BaseModel):
    reason: Optional[str] = None


# ── Audit Schemas ─────────────────────────────────────────────────────────────

class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    envelope_id: uuid.UUID
    recipient_id: Optional[uuid.UUID] = None
    event_type: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[Any] = None
    created_at: datetime


# ── Comment Schemas ───────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    text: str


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    envelope_id: uuid.UUID
    user_id: int
    text: str
    created_at: datetime
    author_name: Optional[str] = None
    author_email: Optional[str] = None


# ── Bulk Send Schemas ─────────────────────────────────────────────────────────

class BulkSendResponse(BaseModel):
    batch_id: str
    total: int
    created: int
    failed: int = 0


class BulkSendStatusResponse(BaseModel):
    batch_id: str
    total: int
    sent: int
    completed: int
    failed: int


# ── Folder Schemas ────────────────────────────────────────────────────────────

class FolderCreate(BaseModel):
    name: str


class FolderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    created_at: datetime


class MoveEnvelopesRequest(BaseModel):
    envelope_ids: List[str]
    folder_id: Optional[str] = None
    moved_to: Optional[str] = None  # "inbox" | "sent" — moves to the real sidebar view
