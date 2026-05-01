import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.calendar import Calendar
from app.models.user import User
from app.rl.state import rl_state
from app.schemas.calendar import CalendarCreate, CalendarOut, CalendarUpdate

router = APIRouter(prefix="/calendars", tags=["Calendars"])


async def _get_calendar_or_404(db: AsyncSession, calendar_id: uuid.UUID, user_id: uuid.UUID) -> Calendar:
    result = await db.execute(
        select(Calendar).where(Calendar.id == calendar_id, Calendar.user_id == user_id)
    )
    cal = result.scalar_one_or_none()
    if not cal:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Calendar not found"}},
        )
    return cal


@router.get("", response_model=list[CalendarOut])
async def list_calendars(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Calendar).where(Calendar.user_id == current_user.id)
    )
    return [CalendarOut.model_validate(c) for c in result.scalars().all()]


@router.post("", response_model=CalendarOut, status_code=status.HTTP_201_CREATED)
async def create_calendar(
    body: CalendarCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = rl_state.clock.now()
    cal = Calendar(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=body.name,
        color=body.color,
        is_visible=body.is_visible,
        is_default=False,
        is_shared=False,
        created_at=now,
        updated_at=now,
    )
    db.add(cal)
    await db.flush()
    rl_state.event_log.append("calendar_created", {"id": str(cal.id)})
    return CalendarOut.model_validate(cal)


@router.patch("/{calendar_id}", response_model=CalendarOut)
async def update_calendar(
    calendar_id: uuid.UUID,
    body: CalendarUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cal = await _get_calendar_or_404(db, calendar_id, current_user.id)

    if body.name is not None:
        cal.name = body.name
    if body.color is not None:
        cal.color = body.color
    if body.is_visible is not None:
        cal.is_visible = body.is_visible
    if body.permission_level is not None:
        cal.permission_level = body.permission_level

    cal.updated_at = rl_state.clock.now()
    await db.flush()
    rl_state.event_log.append("calendar_updated", {"id": str(cal.id)})
    return CalendarOut.model_validate(cal)


@router.delete("/{calendar_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calendar(
    calendar_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cal = await _get_calendar_or_404(db, calendar_id, current_user.id)
    if cal.is_default:
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "default_calendar", "message": "Cannot delete the default calendar"}},
        )
    await db.delete(cal)
    await db.flush()
    rl_state.event_log.append("calendar_deleted", {"id": str(calendar_id)})
