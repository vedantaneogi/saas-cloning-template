import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class CalendarDelegate(Base):
    """Permission grant: owner_user_id allows delegate_user_id to view/edit
    their calendar. Single row per pair; level decides what the delegate can
    actually do."""

    __tablename__ = "calendar_delegates"
    __table_args__ = (
        UniqueConstraint("owner_user_id", "delegate_user_id", name="uq_calendar_delegate"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    delegate_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # free_busy = times only, reviewer = read full detail, editor = read+write.
    level: Mapped[str] = mapped_column(
        Enum("free_busy", "reviewer", "editor", name="calendar_delegate_level_enum"),
        default="reviewer",
    )
    # Mail delegation: independent of calendar level. read = browse the
    # owner's inbox; send_on_behalf = compose with "Owner via Delegate";
    # send_as = compose as the owner. "none" disables.
    mail_level: Mapped[str] = mapped_column(
        Enum("none", "read", "send_on_behalf", "send_as", name="mail_delegate_level_enum"),
        default="none",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
