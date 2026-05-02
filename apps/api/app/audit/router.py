import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import service as audit_svc
from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
from app.envelopes import service as env_svc
from app.envelopes.schemas import AuditEventResponse

router = APIRouter(tags=["audit"])


@router.get("/envelopes/{envelope_id}/audit", response_model=list[AuditEventResponse])
async def get_audit_trail(
    envelope_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    envelope = await env_svc.get_envelope(db, envelope_id, current_user.id)
    if not envelope:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Envelope not found")
    return await audit_svc.get_audit_events(db, envelope_id)
