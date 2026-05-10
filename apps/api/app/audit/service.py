import uuid
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.envelopes.models import AuditEvent


async def log_event(
    db: AsyncSession,
    envelope_id: uuid.UUID,
    event_type: str,
    recipient_id: Optional[uuid.UUID] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
) -> AuditEvent:
    event = AuditEvent(
        envelope_id=envelope_id,
        recipient_id=recipient_id,
        event_type=event_type,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


async def get_audit_events(
    db: AsyncSession, envelope_id: uuid.UUID
) -> list[AuditEvent]:
    result = await db.execute(
        select(AuditEvent)
        .where(AuditEvent.envelope_id == envelope_id)
        .order_by(AuditEvent.created_at.asc())
    )
    return result.scalars().all()
