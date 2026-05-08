import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index("idx_messages_user_folder", "user_id", "folder_id"),
        Index("idx_messages_conversation", "conversation_id"),
        Index("idx_messages_unread", "user_id", "is_read"),
        Index("idx_messages_flagged", "user_id", "is_flagged"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    conversation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True
    )
    folder_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("folders.id", ondelete="CASCADE"), nullable=False)
    from_address: Mapped[str] = mapped_column(String(500), nullable=False)
    from_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    to_addresses: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    cc_addresses: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    bcc_addresses: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    subject: Mapped[str] = mapped_column(String(2000), nullable=False, default="")
    body_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_draft: Mapped[bool] = mapped_column(Boolean, default=False)
    importance: Mapped[str] = mapped_column(
        Enum("low", "normal", "high", name="importance_enum"), default="normal"
    )
    sensitivity: Mapped[str] = mapped_column(
        Enum("normal", "personal", "private", "confidential", name="sensitivity_enum"), default="normal"
    )
    # Encrypt mode (Outlook "Set permission on this item"). When != 'none' the
    # message is treated as encrypted by the reading pane and the sent-folder
    # row gets a lock pill. Independent of `sensitivity` because Outlook lets
    # the user pick e.g. "General" + "Encrypt-Only" together.
    encrypt_mode: Mapped[str] = mapped_column(
        Enum(
            "none",
            "company_confidential",
            "company_confidential_view_only",
            "do_not_forward",
            "encrypt_only",
            name="encrypt_mode_enum",
        ),
        default="none",
        server_default="none",
    )
    has_attachments: Mapped[bool] = mapped_column(Boolean, default=False)
    in_reply_to_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("messages.id", ondelete="SET NULL"), nullable=True
    )
    reply_type: Mapped[str] = mapped_column(
        Enum("none", "reply", "reply_all", "forward", name="reply_type_enum"), default="none"
    )
    event_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("events.id", ondelete="SET NULL"), nullable=True
    )
    snooze_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_send_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    received_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    attachments: Mapped[list["Attachment"]] = relationship("Attachment", back_populates="message", lazy="noload")


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    message: Mapped["Message"] = relationship("Message", back_populates="attachments")
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    is_inline: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class MessageCategory(Base):
    __tablename__ = "message_categories"

    message_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True
    )
