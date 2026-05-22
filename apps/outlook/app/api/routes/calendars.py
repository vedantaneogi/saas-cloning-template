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

    # Owner info — public consumers see who's calendar they're looking at.
    owner_q = await db.execute(select(User).where(User.id == cal.user_id))
    owner = owner_q.scalar_one_or_none()
    owner_name = owner.display_name if owner else cal.name
    owner_email = owner.email if owner else None

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
            "owner_name": owner_name,
            "owner_email": owner_email,
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
        "owner_name": owner_name,
        "owner_email": owner_email,
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
    """Subscribe to another user's default calendar (overlay it on your grid).

    Requires the target user to have explicitly delegated calendar access to
    the current user. The delegate's level (free_busy / reviewer / editor)
    is mirrored onto the subscription's permission_level so list_events can
    redact event detail accordingly.
    """
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

    # Gate on an explicit delegate grant.
    deleg_q = await db.execute(
        select(CalendarDelegate).where(
            CalendarDelegate.owner_user_id == owner.id,
            CalendarDelegate.delegate_user_id == current_user.id,
        )
    )
    delegate_row = deleg_q.scalar_one_or_none()
    if not delegate_row:
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "not_delegated", "message":
                f"{owner.display_name} hasn't delegated calendar access to you. Ask them to add you as a delegate first."}},
        )

    # Map delegate level → calendar permission_level. The legacy enum on
    # Calendar is none|free_busy|read|write|delegate, so we cherry-pick the
    # closest equivalent.
    permission_for_level = {
        "free_busy": "free_busy",
        "reviewer": "read",
        "editor": "write",
    }
    permission = permission_for_level.get(delegate_row.level, "read")

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
        permission_level=permission,
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
    level: Optional[str] = None  # calendar level: free_busy | reviewer | editor
    mail_level: Optional[str] = None  # mail level: none | read | send_on_behalf | send_as


class DelegateOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    owner_user_id: uuid.UUID
    delegate_user_id: uuid.UUID
    delegate_email: Optional[str] = None
    delegate_name: Optional[str] = None
    level: str
    mail_level: str = "none"
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
    """Grant another user access to the current user's calendar and/or mail
    at the given levels. Idempotent on the (owner, delegate) pair — existing
    rows have their levels updated. Either level may be omitted to leave it
    unchanged on update; on create, defaults are reviewer + none."""
    if body.level is not None and body.level not in ("free_busy", "reviewer", "editor"):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "invalid_level", "message": "level must be free_busy / reviewer / editor"}},
        )
    if body.mail_level is not None and body.mail_level not in ("none", "read", "send_on_behalf", "send_as"):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "invalid_mail_level", "message": "mail_level must be none / read / send_on_behalf / send_as"}},
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
        if body.level is not None:
            delegate.level = body.level
        if body.mail_level is not None:
            delegate.mail_level = body.mail_level
    else:
        delegate = CalendarDelegate(
            id=uuid.uuid4(),
            owner_user_id=current_user.id,
            delegate_user_id=target.id,
            level=body.level or "reviewer",
            mail_level=body.mail_level or "none",
            created_at=now,
        )
        db.add(delegate)
    await db.flush()
    # Sync any active subscription so its permission_level reflects the new
    # delegate level. Without this an editor → free_busy demotion would still
    # show full event detail to the delegate's grid.
    permission_for_level = {"free_busy": "free_busy", "reviewer": "read", "editor": "write"}
    sub_q = await db.execute(
        select(Calendar).where(
            Calendar.user_id == target.id,
            Calendar.shared_by_user_id == current_user.id,
        )
    )
    for sub in sub_q.scalars().all():
        sub.permission_level = permission_for_level.get(delegate.level, "read")
        sub.updated_at = now

    rl_state.event_log.append("calendar_delegate_set", {
        "owner": str(current_user.id),
        "delegate": str(target.id),
        "level": delegate.level,
        "mail_level": delegate.mail_level,
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
    # Auto-cleanup: revoke any subscriptions the delegate had on this owner's
    # calendar. Without this the overlay sticks around even though the
    # delegate row is gone — the user effectively keeps stolen access.
    sub_q = await db.execute(
        select(Calendar).where(
            Calendar.user_id == delegate.delegate_user_id,
            Calendar.shared_by_user_id == delegate.owner_user_id,
        )
    )
    for sub in sub_q.scalars().all():
        await db.delete(sub)

    await db.delete(delegate)
    await db.flush()
    rl_state.event_log.append("calendar_delegate_removed", {"id": str(delegate_id)})
