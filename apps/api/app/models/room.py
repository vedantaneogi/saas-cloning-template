"""Room directory — bookable conference rooms / focus rooms.

Tenant-wide (no user_id), so the same room list is shared across every
user in the seed. Created automatically on first boot with the five mock
rooms from the scheduling spec; users can add more via the inline
"Create new room" form on the location field or in the Scheduling
Assistant Rooms section.
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, default=4)
    status: Mapped[str] = mapped_column(
        Enum("available", "busy", name="room_status_enum"),
        default="available",
        server_default="available",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
