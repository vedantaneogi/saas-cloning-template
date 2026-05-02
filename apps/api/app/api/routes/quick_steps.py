import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.routes.messages import _get_message_or_404
from app.db.session import get_db
from app.models.message import Message
from app.models.quick_step import QuickStep
from app.models.user import User
from app.rl.state import rl_state

router = APIRouter(prefix="/quick-steps", tags=["Quick Steps"])


class QuickStepOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    name: str
    icon: Optional[str]
    actions: list[dict[str, Any]]
    shortcut_key: Optional[str]
    sort_order: int


class QuickStepCreate(BaseModel):
    name: str
    icon: Optional[str] = None
    actions: list[dict[str, Any]] = []
    shortcut_key: Optional[str] = None


class QuickStepUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    actions: Optional[list[dict[str, Any]]] = None
    shortcut_key: Optional[str] = None


async def _get_qs_or_404(db: AsyncSession, qs_id: uuid.UUID, user_id: uuid.UUID) -> QuickStep:
    result = await db.execute(
        select(QuickStep).where(QuickStep.id == qs_id, QuickStep.user_id == user_id)
    )
    qs = result.scalar_one_or_none()
    if not qs:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Quick step not found"}},
        )
    return qs


@router.get("", response_model=list[QuickStepOut])
async def list_quick_steps(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(QuickStep)
        .where(QuickStep.user_id == current_user.id)
        .order_by(QuickStep.sort_order)
    )
    return [QuickStepOut.model_validate(qs) for qs in result.scalars().all()]


@router.post("", response_model=QuickStepOut, status_code=status.HTTP_201_CREATED)
async def create_quick_step(
    body: QuickStepCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    qs = QuickStep(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=body.name,
        icon=body.icon,
        actions=body.actions,
        shortcut_key=body.shortcut_key,
        sort_order=0,
    )
    db.add(qs)
    await db.flush()
    rl_state.event_log.append("quick_step_created", {"id": str(qs.id), "name": qs.name})
    return QuickStepOut.model_validate(qs)


@router.patch("/{qs_id}", response_model=QuickStepOut)
async def update_quick_step(
    qs_id: uuid.UUID,
    body: QuickStepUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    qs = await _get_qs_or_404(db, qs_id, current_user.id)
    if body.name is not None:
        qs.name = body.name
    if body.icon is not None:
        qs.icon = body.icon
    if body.actions is not None:
        qs.actions = body.actions
    if body.shortcut_key is not None:
        qs.shortcut_key = body.shortcut_key
    await db.flush()
    return QuickStepOut.model_validate(qs)


@router.delete("/{qs_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quick_step(
    qs_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    qs = await _get_qs_or_404(db, qs_id, current_user.id)
    await db.delete(qs)


@router.post("/{qs_id}/run")
async def run_quick_step(
    qs_id: uuid.UUID,
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    qs = await _get_qs_or_404(db, qs_id, current_user.id)
    msg = await _get_message_or_404(db, message_id, current_user.id)

    applied = []
    now = rl_state.clock.now()

    for action in qs.actions:
        action_type = action.get("type")
        params = action.get("params", {})

        if action_type == "mark_read":
            msg.is_read = True
            applied.append("mark_read")
        elif action_type == "mark_unread":
            msg.is_read = False
            applied.append("mark_unread")
        elif action_type == "flag":
            msg.is_flagged = True
            applied.append("flag")
        elif action_type == "unflag":
            msg.is_flagged = False
            applied.append("unflag")
        elif action_type == "move_to_folder":
            from sqlalchemy import select as sa_select
            from app.models.folder import Folder
            folder_ref = params.get("folder", "")
            folder_result = await db.execute(
                sa_select(Folder).where(
                    Folder.user_id == current_user.id,
                    (Folder.slug == folder_ref) | (Folder.name == folder_ref),
                )
            )
            target = folder_result.scalar_one_or_none()
            if target:
                msg.folder_id = target.id
                applied.append(f"move_to_folder:{folder_ref}")
        elif action_type == "delete":
            from sqlalchemy import select as sa_select
            from app.models.folder import Folder
            deleted_result = await db.execute(
                sa_select(Folder).where(Folder.user_id == current_user.id, Folder.slug == "deleted")
            )
            deleted_folder = deleted_result.scalar_one_or_none()
            if deleted_folder:
                msg.folder_id = deleted_folder.id
            applied.append("delete")

    msg.updated_at = now
    await db.flush()
    rl_state.event_log.append("quick_step_run", {"qs_id": str(qs_id), "message_id": str(message_id), "applied": applied})
    return {"status": "ok", "applied": applied}
