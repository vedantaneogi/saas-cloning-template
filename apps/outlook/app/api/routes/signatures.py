import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.signature import Signature
from app.models.user import User
from app.rl.state import rl_state
from app.schemas.signature import SignatureCreate, SignatureOut, SignatureUpdate

router = APIRouter(prefix="/signatures", tags=["Signatures"])


async def _get_sig_or_404(db: AsyncSession, sig_id: uuid.UUID, user_id: uuid.UUID) -> Signature:
    result = await db.execute(
        select(Signature).where(Signature.id == sig_id, Signature.user_id == user_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Signature not found"}},
        )
    return s


@router.get("", response_model=list[SignatureOut])
async def list_signatures(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Signature).where(Signature.user_id == current_user.id)
    )
    return [SignatureOut.model_validate(s) for s in result.scalars().all()]


@router.post("", response_model=SignatureOut, status_code=status.HTTP_201_CREATED)
async def create_signature(
    body: SignatureCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = rl_state.clock.now()
    sig = Signature(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=body.name,
        body_html=body.body_html,
        is_default_new=body.is_default_new,
        is_default_reply=body.is_default_reply,
        created_at=now,
        updated_at=now,
    )
    db.add(sig)
    await db.flush()
    rl_state.event_log.append("signature_created", {"id": str(sig.id)})
    return SignatureOut.model_validate(sig)


@router.patch("/{signature_id}", response_model=SignatureOut)
async def update_signature(
    signature_id: uuid.UUID,
    body: SignatureUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sig = await _get_sig_or_404(db, signature_id, current_user.id)

    if body.name is not None:
        sig.name = body.name
    if body.body_html is not None:
        sig.body_html = body.body_html
    if body.is_default_new is not None:
        sig.is_default_new = body.is_default_new
    if body.is_default_reply is not None:
        sig.is_default_reply = body.is_default_reply

    sig.updated_at = rl_state.clock.now()
    await db.flush()
    rl_state.event_log.append("signature_updated", {"id": str(sig.id)})
    return SignatureOut.model_validate(sig)


@router.delete("/{signature_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_signature(
    signature_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sig = await _get_sig_or_404(db, signature_id, current_user.id)
    await db.delete(sig)
    await db.flush()
    rl_state.event_log.append("signature_deleted", {"id": str(signature_id)})
