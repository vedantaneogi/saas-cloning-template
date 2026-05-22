import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    world_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    timezone: Mapped[str] = mapped_column(String(100), default="UTC")
    locale: Mapped[str] = mapped_column(String(20), default="en-US")
    role: Mapped[str] = mapped_column(
        Enum("worker", "manager", "admin", name="user_role_enum"),
        default="worker",
    )
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    out_of_office_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    out_of_office_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    out_of_office_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    out_of_office_message_internal: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    out_of_office_message_external: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
