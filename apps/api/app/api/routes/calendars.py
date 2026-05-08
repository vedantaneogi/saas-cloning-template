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
    if body.is_shared is not None:
        cal.is_shared = body.is_shared
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


from pydantic import BaseModel  # noqa: E402
import secrets  # noqa: E402
from datetime import datetime  # noqa: E402
from app.models.delegate import CalendarDelegate  # noqa: E402


class SubscribeRequest(BaseModel):
    email: str


class PublishRequest(BaseModel):
    enable: bool
    scope: Optional[str] = None  # "free_busy" or "full"


class PublishResponse(BaseModel):
    publish_token: Optional[str] = None
    publish_scope: str
    public_url: Optional[str] = None


@router.post("/{calendar_id}/publish", response_model=PublishResponse)
async def publish_calendar(
    calendar_id: uuid.UUID,
    body: PublishRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle a tokenized public link for the calendar. enable=true generates
    a token if none exists; enable=false clears it. scope picks free-busy
    (times only) vs full (full event detail) for the public consumer."""
    cal = await _get_calendar_or_404(db, calendar_id, current_user.id)

    if body.scope and body.scope in ("free_busy", "full"):
        cal.publish_scope = body.scope

    if body.enable:
        if not cal.publish_token:
            cal.publish_token = secrets.token_urlsafe(24)
    else:
        cal.publish_token = None

    cal.updated_at = rl_state.clock.now()
    await db.flush()
    rl_state.event_log.append("calendar_published", {
        "id": str(cal.id),
        "enabled": cal.publish_token is not None,
    })
    public_url = f"/api/v1/calendars/public/{cal.publish_token}" if cal.publish_token else None
    return PublishResponse(
        publish_token=cal.publish_token,
        publish_scope=cal.publish_scope,
        public_url=public_url,
    )


@router.get("/public/{token}")
async def public_calendar_by_token(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public read-only calendar endpoint. No auth — the token IS the auth.
    Pulls every event the calendar's owner has on this calendar (recurring
    parents get expanded into 90 days of occurrences) so a Weekly Standup
    actually appears on the public month view."""
    from app.models.calendar import Event
    from app.api.routes.events import _expand_recurring_event
    from datetime import timedelta

    result = await db.execute(select(Calendar).where(Calendar.publish_token == token))
    cal = result.scalar_one_or_none()
    if not cal:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Public calendar not found"}},
        )

    now = rl_state.clock.now()
    window_start = now - timedelta(days=7)
    window_end = now + timedelta(days=90)

    # Non-recurring events on this calendar.
    nr_q = await db.execute(
        select(Event).where(
            Event.calendar_id == cal.id,
            Event.is_recurring.is_(False),
            Event.start_time >= window_start,
            Event.start_time <= window_end,
        ).order_by(Event.start_time)
    )
    events = list(nr_q.scalars().all())

    # Recurring parents — expand each into instances in the window.
    rec_q = await db.execute(
        select(Event).where(
            Event.calendar_id == cal.id,
            Event.is_recurring.is_(True),
            Event.recurrence_parent_id.is_(None),
            Event.start_time <= window_end,
        )
    )
    recurring_events: list = []
    for parent in rec_q.scalars().all():
        instances = _expand_recurring_event(parent, window_start, window_end)
        # _expand_recurring_event returns EventOut objects; we need raw-ish
        # rows for the response shapes below.
        for inst in instances:
            recurring_events.append(inst)

    # Merge non-recurring rows + expanded recurring instances. Both expose
    # the same attribute names (.id, .title, .start_time, etc.).
    all_blocks = list(events) + recurring_events
    all_blocks.sort(key=lambda x: x.start_time)

    if cal.publish_scope == "full":
        return {
            "calendar": cal.name,
            "scope": "full",
            "events": [
                {
                    "id": str(e.id),
                    "title": e.title,
                    "location": e.location,
                    "description": getattr(e, "description", None),
                    "start_time": e.start_time.isoformat(),
                    "end_time": e.end_time.isoformat(),
                    "all_day": e.all_day,
                    "status": e.status,
                }
                for e in all_blocks
            ],
        }
    # free_busy default — strip everything except the time block + status.
    return {
        "calendar": cal.name,
        "scope": "free_busy",
        "slots": [
            {
                "start": e.start_time.isoformat(),
                "end": e.end_time.isoformat(),
                "status": e.status,
            }
            for e in all_blocks
        ],
    }


@router.post("/subscribe", response_model=CalendarOut, status_code=status.HTTP_201_CREATED)
async def subscribe_calendar(
    body: SubscribeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Subscribe to another user's default calendar (overlay it on your grid)."""
    # Find the target user by email
    owner_result = await db.execute(select(User).where(User.email == body.email))
    owner = owner_result.scalar_one_or_none()
    if not owner:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": f"No user with email {body.email!r}"}},
        )
    if owner.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "invalid", "message": "Cannot subscribe to your own calendar"}},
        )

    # Check not already subscribed
    existing = await db.execute(
        select(Calendar).where(
            Calendar.user_id == current_user.id,
            Calendar.shared_by_user_id == owner.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "already_subscribed", "message": "Already subscribed to this calendar"}},
        )

    now = rl_state.clock.now()
    cal = Calendar(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=f"{owner.display_name}'s calendar",
        color="#8764B8",
        is_default=False,
        is_shared=False,
        shared_by_user_id=owner.id,
        permission_level="read",
        is_visible=True,
        created_at=now,
        updated_at=now,
    )
    db.add(cal)
    await db.flush()
    rl_state.event_log.append("calendar_subscribed", {
        "id": str(cal.id),
        "owner_id": str(owner.id),
        "owner_email": body.email,
    })
    return CalendarOut.model_validate(cal)


@router.get("/pub/{calendar_id}")
async def public_calendar(
    calendar_id: uuid.UUID,
    detail: str = "availability",
    db: AsyncSession = Depends(get_db),
):
    """Public calendar endpoint — no auth required. Returns events for a shared calendar."""
    from app.models.calendar import Event
    from app.schemas.calendar import EventOut

    result = await db.execute(select(Calendar).where(Calendar.id == calendar_id))
    cal = result.scalar_one_or_none()
    if not cal:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Calendar not found"}})

    events_result = await db.execute(
        select(Event).where(Event.calendar_id == calendar_id).order_by(Event.start_time)
    )
    events = events_result.scalars().all()

    if detail == "availability":
        return {
            "calendar": cal.name,
            "slots": [
                {"start": e.start_time.isoformat(), "end": e.end_time.isoformat(), "status": e.status}
                for e in events
            ],
        }
    else:
        return {
            "calendar": cal.name,
            "events": [EventOut.model_validate(e).model_dump() for e in events],
        }


# ─── Delegates ────────────────────────────────────────────────────────────────

class DelegateCreate(BaseModel):
    email: str
    level: str = "reviewer"  # free_busy | reviewer | editor


class DelegateOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    owner_user_id: uuid.UUID
    delegate_user_id: uuid.UUID
    delegate_email: Optional[str] = None
    delegate_name: Optional[str] = None
    level: str
    created_at: datetime


@router.get("/delegates", response_model=list[DelegateOut])
async def list_delegates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All delegates the current user has granted access to their calendar."""
    rows = await db.execute(
        select(CalendarDelegate, User)
        .join(User, User.id == CalendarDelegate.delegate_user_id)
        .where(CalendarDelegate.owner_user_id == current_user.id)
        .order_by(CalendarDelegate.created_at)
    )
    out: list[DelegateOut] = []
    for d, u in rows.all():
        item = DelegateOut.model_validate(d)
        item.delegate_email = u.email
        item.delegate_name = u.display_name
        out.append(item)
    return out


@router.post(
    "/delegates",
    response_model=DelegateOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_delegate(
    body: DelegateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Grant another user access to the current user's calendar at the given
    level. Idempotent on the (owner, delegate) pair — existing rows have
    their level updated."""
    if body.level not in ("free_busy", "reviewer", "editor"):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "invalid_level", "message": "level must be free_busy / reviewer / editor"}},
        )
    target_q = await db.execute(select(User).where(User.email == body.email))
    target = target_q.scalar_one_or_none()
    if not target:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "user_not_found", "message": f"No user with email {body.email}"}},
        )
    if target.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "invalid", "message": "Cannot delegate to yourself"}},
        )

    existing_q = await db.execute(
        select(CalendarDelegate).where(
            CalendarDelegate.owner_user_id == current_user.id,
            CalendarDelegate.delegate_user_id == target.id,
        )
    )
    delegate = existing_q.scalar_one_or_none()
    now = rl_state.clock.now()
    if delegate:
        delegate.level = body.level
    else:
        delegate = CalendarDelegate(
            id=uuid.uuid4(),
            owner_user_id=current_user.id,
            delegate_user_id=target.id,
            level=body.level,
            created_at=now,
        )
        db.add(delegate)
    await db.flush()
    rl_state.event_log.append("calendar_delegate_set", {
        "owner": str(current_user.id),
        "delegate": str(target.id),
        "level": body.level,
    })
    out = DelegateOut.model_validate(delegate)
    out.delegate_email = target.email
    out.delegate_name = target.display_name
    return out


@router.delete("/delegates/{delegate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_delegate(
    delegate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke a delegate. Only the owner of the original grant can remove it."""
    row_q = await db.execute(
        select(CalendarDelegate).where(
            CalendarDelegate.id == delegate_id,
            CalendarDelegate.owner_user_id == current_user.id,
        )
    )
    delegate = row_q.scalar_one_or_none()
    if not delegate:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Delegate not found"}},
        )
    await db.delete(delegate)
    await db.flush()
    rl_state.event_log.append("calendar_delegate_removed", {"id": str(delegate_id)})
