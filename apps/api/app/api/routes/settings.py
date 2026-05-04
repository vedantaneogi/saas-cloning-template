from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.rl.state import rl_state
from app.schemas.user import UserOut

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingsOut(BaseModel):
    mail: dict[str, Any]
    calendar: dict[str, Any]
    general: dict[str, Any]
    feature_flags: dict[str, Any]


class SettingsUpdate(BaseModel):
    mail: Optional[dict[str, Any]] = None
    calendar: Optional[dict[str, Any]] = None
    general: Optional[dict[str, Any]] = None


class OOFOut(BaseModel):
    enabled: bool
    start: Optional[str] = None
    end: Optional[str] = None
    internal_message: Optional[str] = None
    external_message: Optional[str] = None


class OOFUpdate(BaseModel):
    enabled: Optional[bool] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    internal_message: Optional[str] = None
    external_message: Optional[str] = None


# In-memory settings store (per user in production would be a DB table,
# but for the RL environment an in-memory map per user_id is fine)
_user_settings: dict[str, dict] = {}
_user_delegates: dict[str, list[dict]] = {}


def _default_settings(user: User) -> dict:
    return {
        "mail": {
            "reading_pane": "right",
            "conversation_view": True,
            "focused_inbox": rl_state.feature_flags.get("focused_inbox", True),
            "show_sender_photos": True,
            "mark_read_on_change": True,
            "mark_read_after_seconds": 3,
            "auto_expand_conversations": True,
            "show_preview_text": True,
        },
        "calendar": {
            "first_day_of_week": 0,
            "work_hours_start": "08:00",
            "work_hours_end": "17:00",
            "default_duration_minutes": 30,
            "show_week_numbers": False,
            "default_reminder_minutes": 15,
        },
        "general": {
            "timezone": user.timezone,
            "locale": user.locale,
            "theme": "light",
            "language": "en-US",
            "notifications_enabled": True,
        },
    }


@router.get("", response_model=SettingsOut)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = str(current_user.id)
    stored = _user_settings.get(uid, {})
    defaults = _default_settings(current_user)
    return SettingsOut(
        mail={**defaults["mail"], **stored.get("mail", {})},
        calendar={**defaults["calendar"], **stored.get("calendar", {})},
        general={**defaults["general"], **stored.get("general", {})},
        feature_flags=rl_state.feature_flags,
    )


@router.patch("", response_model=SettingsOut)
async def update_settings(
    body: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = str(current_user.id)
    if uid not in _user_settings:
        _user_settings[uid] = {}

    if body.mail:
        _user_settings[uid].setdefault("mail", {}).update(body.mail)
    if body.calendar:
        _user_settings[uid].setdefault("calendar", {}).update(body.calendar)
    if body.general:
        _user_settings[uid].setdefault("general", {}).update(body.general)
        if "timezone" in body.general:
            current_user.timezone = body.general["timezone"]
        if "locale" in body.general:
            current_user.locale = body.general["locale"]

    current_user.updated_at = rl_state.clock.now()
    rl_state.event_log.append("settings_updated", {"user_id": uid})

    stored = _user_settings[uid]
    defaults = _default_settings(current_user)
    return SettingsOut(
        mail={**defaults["mail"], **stored.get("mail", {})},
        calendar={**defaults["calendar"], **stored.get("calendar", {})},
        general={**defaults["general"], **stored.get("general", {})},
        feature_flags=rl_state.feature_flags,
    )


@router.get("/oof", response_model=OOFOut)
async def get_oof(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return OOFOut(
        enabled=current_user.out_of_office_enabled,
        start=current_user.out_of_office_start.isoformat() if current_user.out_of_office_start else None,
        end=current_user.out_of_office_end.isoformat() if current_user.out_of_office_end else None,
        internal_message=current_user.out_of_office_message_internal,
        external_message=current_user.out_of_office_message_external,
    )


@router.patch("/oof", response_model=OOFOut)
async def update_oof(
    body: OOFUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.enabled is not None:
        current_user.out_of_office_enabled = body.enabled
    if body.start is not None:
        current_user.out_of_office_start = body.start
    if body.end is not None:
        current_user.out_of_office_end = body.end
    if body.internal_message is not None:
        current_user.out_of_office_message_internal = body.internal_message
    if body.external_message is not None:
        current_user.out_of_office_message_external = body.external_message

    current_user.updated_at = rl_state.clock.now()
    rl_state.event_log.append("oof_updated", {"user_id": str(current_user.id), "enabled": current_user.out_of_office_enabled})

    return OOFOut(
        enabled=current_user.out_of_office_enabled,
        start=current_user.out_of_office_start.isoformat() if current_user.out_of_office_start else None,
        end=current_user.out_of_office_end.isoformat() if current_user.out_of_office_end else None,
        internal_message=current_user.out_of_office_message_internal,
        external_message=current_user.out_of_office_message_external,
    )


# ---------------------------------------------------------------------------
# Delegates
# ---------------------------------------------------------------------------

class DelegateEntry(BaseModel):
    id: str
    email: str
    name: str
    mail_permission: str = "none"
    calendar_permission: str = "none"


@router.get("/delegates", response_model=list[DelegateEntry])
async def list_delegates(
    current_user: User = Depends(get_current_user),
):
    uid = str(current_user.id)
    return [DelegateEntry(**d) for d in _user_delegates.get(uid, [])]


@router.post("/delegates", response_model=DelegateEntry, status_code=201)
async def add_delegate(
    body: DelegateEntry,
    current_user: User = Depends(get_current_user),
):
    uid = str(current_user.id)
    if uid not in _user_delegates:
        _user_delegates[uid] = []
    _user_delegates[uid].append(body.model_dump())
    rl_state.event_log.append("delegate_added", {"user_id": uid, "delegate_email": body.email})
    return body


@router.delete("/delegates/{delegate_id}", status_code=204)
async def remove_delegate(
    delegate_id: str,
    current_user: User = Depends(get_current_user),
):
    uid = str(current_user.id)
    delegates = _user_delegates.get(uid, [])
    _user_delegates[uid] = [d for d in delegates if d["id"] != delegate_id]
    rl_state.event_log.append("delegate_removed", {"user_id": uid, "delegate_id": delegate_id})
