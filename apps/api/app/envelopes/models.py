import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EnvelopeStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    delivered = "delivered"
    completed = "completed"
    declined = "declined"
    voided = "voided"


class RecipientRole(str, enum.Enum):
    signer = "signer"
    in_person = "in_person"  # In-person signer (frontend allows this role)
    cc = "cc"
    viewer = "viewer"
    approver = "approver"


class RecipientStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    delivered = "delivered"
    signed = "signed"
    declined = "declined"


class FieldType(str, enum.Enum):
    signature = "signature"
    initial = "initial"
    date_signed = "date_signed"
    text = "text"
    name = "name"
    email = "email"
    company = "company"
    title = "title"
    number = "number"
    checkbox = "checkbox"
    dropdown = "dropdown"
    radio = "radio"
    attachment = "attachment"
    approve = "approve"
    decline = "decline"
    stamp = "stamp"
    note = "note"
    formula = "formula"
    drawing = "drawing"
    payment = "payment"


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    envelopes: Mapped[list["Envelope"]] = relationship("Envelope", back_populates="folder")


class Envelope(Base):
    __tablename__ = "envelopes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    folder_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("folders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    moved_to: Mapped[str | None] = mapped_column(String(50), nullable=True)
    subject: Mapped[str] = mapped_column(String(512), nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[EnvelopeStatus] = mapped_column(
        Enum(EnvelopeStatus, name="envelopestatus"),
        default=EnvelopeStatus.draft,
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reminder_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    batch_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    allow_comments: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")
    responsive_signing: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")
    allow_reassign: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="envelopes")  # noqa: F821
    folder: Mapped["Folder | None"] = relationship("Folder", back_populates="envelopes")
    documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="envelope", cascade="all, delete-orphan", order_by="Document.order"
    )
    recipients: Mapped[list["Recipient"]] = relationship(
        "Recipient",
        back_populates="envelope",
        cascade="all, delete-orphan",
        order_by="Recipient.routing_order",
    )
    audit_events: Mapped[list["AuditEvent"]] = relationship(
        "AuditEvent", back_populates="envelope", cascade="all, delete-orphan"
    )
    comments: Mapped[list["Comment"]] = relationship(
        "Comment", back_populates="envelope", cascade="all, delete-orphan"
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    envelope_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("envelopes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    preview_filename: Mapped[str | None] = mapped_column(String(512), nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    envelope: Mapped["Envelope"] = relationship("Envelope", back_populates="documents")
    fields: Mapped[list["Field"]] = relationship(
        "Field", back_populates="document", cascade="all, delete-orphan"
    )


class Recipient(Base):
    __tablename__ = "recipients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    envelope_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("envelopes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    role: Mapped[RecipientRole] = mapped_column(
        Enum(RecipientRole, name="recipientrole"),
        default=RecipientRole.signer,
        nullable=False,
    )
    routing_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[RecipientStatus] = mapped_column(
        Enum(RecipientStatus, name="recipientstatus"),
        default=RecipientStatus.pending,
        nullable=False,
    )
    signing_token: Mapped[str | None] = mapped_column(
        String(128), unique=True, nullable=True, default=None
    )
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    declined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decline_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    access_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    private_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_role_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    id_check: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)

    # Relationships
    envelope: Mapped["Envelope"] = relationship("Envelope", back_populates="recipients")
    fields: Mapped[list["Field"]] = relationship(
        "Field", back_populates="recipient", cascade="all, delete-orphan"
    )
    audit_events: Mapped[list["AuditEvent"]] = relationship(
        "AuditEvent", back_populates="recipient"
    )


class Field(Base):
    __tablename__ = "fields"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recipients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[FieldType] = mapped_column(
        Enum(FieldType, name="fieldtype"),
        nullable=False,
    )
    page: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    x: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    y: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    width: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    height: Mapped[float] = mapped_column(Float, nullable=False, default=40.0)
    required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    label: Mapped[str | None] = mapped_column(String(256), nullable=True)
    conditional_on: Mapped[str | None] = mapped_column(String(128), nullable=True)
    conditional_value: Mapped[str | None] = mapped_column(String(256), nullable=True)
    conditional_action: Mapped[str | None] = mapped_column(String(16), nullable=True, default="show")
    formula: Mapped[str | None] = mapped_column(Text, nullable=True)
    decimal_places: Mapped[int | None] = mapped_column(Integer, default=2, nullable=True)
    payment_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payment_currency: Mapped[str | None] = mapped_column(String(3), nullable=True, default="USD")
    payment_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    options: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    group_name: Mapped[str | None] = mapped_column(String(256), nullable=True)

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="fields")
    recipient: Mapped["Recipient"] = relationship("Recipient", back_populates="fields")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    envelope_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("envelopes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recipient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recipients.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    envelope: Mapped["Envelope"] = relationship("Envelope", back_populates="audit_events")
    recipient: Mapped["Recipient | None"] = relationship("Recipient", back_populates="audit_events")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    envelope_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("envelopes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    envelope: Mapped["Envelope"] = relationship("Envelope", back_populates="comments")
    author: Mapped["User"] = relationship("User")  # noqa: F821
