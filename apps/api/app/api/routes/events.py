import calendar as _cal
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.calendar import Event, EventAttendee
from app.models.folder import Folder
from app.models.message import Message
from app.models.user import User
from app.rl.state import rl_state
from app.schemas.calendar import (
    EventAttendeeOut,
    EventCreate,
    EventOut,
    EventUpdate,
    ProposeTimeRequest,
    RespondRequest,
)

router = APIRouter(prefix="/events", tags=["Events"])


_ICAL_DAY_TO_INT = {
    "SU": 0, "MO": 1, "TU": 2, "WE": 3, "TH": 4, "FR": 5, "SA": 6,
}


def _normalize_days_of_week(raw: Any) -> set[int]:
    """Accept ints (0..6, ical Sun=0) or iCal day codes (MO/TU/...) — return ints."""
    if not raw:
        return set()
    out: set[int] = set()
    for item in raw:
        if isinstance(item, int):
            out.add(item % 7)
        elif isinstance(item, str):
            code = item.strip().upper()[:2]
            if code in _ICAL_DAY_TO_INT:
                out.add(_ICAL_DAY_TO_INT[code])
            else:
                try:
                    out.add(int(item) % 7)
                except (ValueError, TypeError):
                    pass
    return out


def _expand_recurring_event(
    event: Event,
    start_after: datetime,
    start_before: datetime,
    max_instances: int = 200,
) -> list[EventOut]:
    """Generate virtual EventOut instances for a recurring event within [start_after, start_before]."""
    rule = event.recurrence_rule or {}
    # Normalize frequency (seed uses 'WEEKLY', UI sends 'weekly' — accept both)
    frequency: str = str(rule.get("frequency", "daily")).lower()
    interval: int = max(1, int(rule.get("interval", 1)))
    end_date_str: Any = rule.get("end_date")
    count_limit: Any = rule.get("count")
    # Normalize days_of_week: accept ints or iCal codes (MO/TU/WE/TH/FR/SA/SU)
    days_of_week: set[int] = _normalize_days_of_week(rule.get("days_of_week"))  # 0=Sun … 6=Sat

    duration = event.end_time - event.start_time
    current = event.start_time
    occurrences: list[EventOut] = []
    total = 0

    # Normalize timezone awareness so comparisons don't blow up.
    # event.start_time is TZ-aware (TIMESTAMPTZ); URL query params arrive naive.
    if current.tzinfo is not None:
        if start_after.tzinfo is None:
            start_after = start_after.replace(tzinfo=timezone.utc)
        if start_before.tzinfo is None:
            start_before = start_before.replace(tzinfo=timezone.utc)
    else:
        if start_after.tzinfo is not None:
            start_after = start_after.replace(tzinfo=None)
        if start_before.tzinfo is not None:
            start_before = start_before.replace(tzinfo=None)

    # For weekly+specific days we step 1 day at a time
    step_daily = frequency == "weekly" and len(days_of_week) > 0

    # Bail if frequency is unrecognized — prevents infinite loop
    if frequency not in {"daily", "weekly", "monthly", "yearly"}:
        return []

    exceptions: set[str] = {str(e) for e in (rule.get("exceptions") or [])}

    while current <= start_before and len(occurrences) < max_instances:
        if count_limit is not None and total >= int(count_limit):
            break
        if end_date_str:
            end_dt = datetime.fromisoformat(str(end_date_str).replace("Z", "+00:00"))
            if current.date() > end_dt.date():
                break

        # Skip exception dates (single occurrences that were deleted or overridden)
        current_iso = current.isoformat()
        if any(current_iso.startswith(exc[:10]) for exc in exceptions):
            if step_daily:
                current += timedelta(days=1)
            elif frequency == "daily":
                current += timedelta(days=interval)
            elif frequency == "weekly":
                current += timedelta(weeks=interval)
            elif frequency == "monthly":
                m = current.month - 1 + interval
                yr = current.year + m // 12
                mo = m % 12 + 1
                day = min(current.day, _cal.monthrange(yr, mo)[1])
                current = current.replace(year=yr, month=mo, day=day)
            elif frequency == "yearly":
                try:
                    current = current.replace(year=current.year + interval)
                except ValueError:
                    current = current.replace(year=current.year + interval, day=28)
            continue

        # Decide whether this date matches the recurrence
        matches = True
        if frequency == "weekly" and days_of_week:
            # Python weekday(): 0=Mon … 6=Sun  →  ical: 0=Sun 1=Mon … 6=Sat
            ical_day = (current.weekday() + 1) % 7
            matches = ical_day in days_of_week

        if matches:
            total += 1
            if current >= start_after:
                inst_id = uuid.uuid5(
                    uuid.NAMESPACE_URL, f"{event.id}/{current.isoformat()}"
                )
                occurrences.append(
                    EventOut(
                        id=inst_id,
                        calendar_id=event.calendar_id,
                        user_id=event.user_id,
                        title=event.title,
                        description=event.description,
                        location=event.location,
                        start_time=current,
                        end_time=current + duration,
                        all_day=event.all_day,
                        is_recurring=True,
                        recurrence_rule=event.recurrence_rule,
                        recurrence_parent_id=event.id,
                        reminder_minutes=event.reminder_minutes,
                        is_online_meeting=event.is_online_meeting,
                        meeting_url=event.meeting_url,
                        status=event.status,
                        sensitivity=event.sensitivity,
                        created_at=event.created_at,
                        updated_at=event.updated_at,
                    )
                )

        # Advance to next candidate date
        if step_daily:
            current += timedelta(days=1)
        elif frequency == "daily":
            current += timedelta(days=interval)
        elif frequency == "weekly":
            current += timedelta(weeks=interval)
        elif frequency == "monthly":
            m = current.month - 1 + interval
            yr = current.year + m // 12
            mo = m % 12 + 1
            day = min(current.day, _cal.monthrange(yr, mo)[1])
            current = current.replace(year=yr, month=mo, day=day)
        elif frequency == "yearly":
            try:
                current = current.replace(year=current.year + interval)
            except ValueError:
                current = current.replace(year=current.year + interval, day=28)

    return occurrences


class EventList(BaseModel):
    items: list[EventOut]
    next_cursor: Optional[str] = None
    total_count: int


class EventDetail(BaseModel):
    event: EventOut
    attendees: list[EventAttendeeOut]


async def _get_event_or_404(db: AsyncSession, event_id: uuid.UUID, user_id: uuid.UUID) -> Event:
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.user_id == user_id)
    )
    ev = result.scalar_one_or_none()
    if not ev:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Event not found"}},
        )
    return ev


async def _get_event_for_view(db: AsyncSession, event_id: uuid.UUID, user: User) -> Event:
    """Return event if the user owns it OR is listed as an attendee. Used for RSVP/view paths."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    ev = result.scalar_one_or_none()
    if not ev:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Event not found"}},
        )
    if ev.user_id == user.id:
        return ev
    att = await db.execute(
        select(EventAttendee).where(
            EventAttendee.event_id == event_id,
            EventAttendee.email == user.email,
        )
    )
    if att.scalar_one_or_none():
        return ev
    raise HTTPException(
        status_code=404,
        detail={"error": {"code": "not_found", "message": "Event not found"}},
    )


def _format_event_when(ev: Event) -> str:
    if ev.all_day:
        return ev.start_time.strftime("%a, %b %d, %Y") + " (all day)"
    return f"{ev.start_time.strftime('%a, %b %d, %Y %I:%M %p')} – {ev.end_time.strftime('%I:%M %p')}"


def _build_invite_html(ev: Event, organizer: User, updated: bool) -> str:
    when = _format_event_when(ev)
    where = ev.location or "—"
    desc = ev.description or ""
    label = "Updated invitation" if updated else "You're invited"
    desc_block = (
        f"<p style='margin-top:12px;font-size:13px;color:#323130;'>{desc}</p>" if desc else ""
    )
    return (
        f"<div style='font-family:Segoe UI,Arial,sans-serif;color:#323130;'>"
        f"<p style='margin:0 0 8px 0;color:#605E5C;font-size:12px;'>{label}</p>"
        f"<h2 style='margin:0 0 12px 0;font-size:18px;'>{ev.title}</h2>"
        f"<table style='font-size:13px;line-height:1.5;'>"
        f"<tr><td style='color:#605E5C;padding-right:8px;'>When</td><td>{when}</td></tr>"
        f"<tr><td style='color:#605E5C;padding-right:8px;'>Where</td><td>{where}</td></tr>"
        f"<tr><td style='color:#605E5C;padding-right:8px;'>Organizer</td><td>{organizer.display_name} &lt;{organizer.email}&gt;</td></tr>"
        f"</table>"
        f"{desc_block}"
        f"<p style='margin-top:16px;font-size:12px;color:#605E5C;'>Use the buttons above to respond.</p>"
        f"</div>"
    )


async def _send_calendar_invite(
    db: AsyncSession, ev: Event, attendee_emails: list[str], organizer: User, updated: bool = False
) -> None:
    """Deliver an in-app invite message to each attendee who has a user account."""
    if not attendee_emails:
        return
    now = rl_state.clock.now()
    when = _format_event_when(ev)
    subject_prefix = "Updated:" if updated else "Invitation:"
    subject = f"{subject_prefix} {ev.title} ({when})"
    body_html = _build_invite_html(ev, organizer, updated)
    body_text = f"{subject}\n\nWhen: {when}\nWhere: {ev.location or '-'}\nOrganizer: {organizer.email}\n\n{ev.description or ''}"

    for email in attendee_emails:
        if not email or email == organizer.email:
            continue
        rec_user_result = await db.execute(select(User).where(User.email == email))
        rec_user = rec_user_result.scalar_one_or_none()
        if not rec_user:
            continue
        inbox_result = await db.execute(
            select(Folder).where(Folder.user_id == rec_user.id, Folder.slug == "inbox")
        )
        inbox = inbox_result.scalar_one_or_none()
        if not inbox:
            continue
        msg = Message(
            id=uuid.uuid4(),
            user_id=rec_user.id,
            folder_id=inbox.id,
            from_address=organizer.email,
            from_name=organizer.display_name,
            to_addresses=[{"email": email, "name": rec_user.display_name}],
            cc_addresses=[],
            bcc_addresses=[],
            subject=subject,
            body_html=body_html,
            body_text=body_text,
            is_read=False,
            is_draft=False,
            event_id=ev.id,
            sent_at=now,
            received_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add(msg)
    await db.flush()


async def _notify_organizer_response(
    db: AsyncSession, ev: Event, responder: User, response: Optional[str], proposal: Optional[dict]
) -> None:
    """Send an in-app status message to the organizer when an attendee responds or proposes a time."""
    if responder.id == ev.user_id:
        return
    organizer_result = await db.execute(select(User).where(User.id == ev.user_id))
    organizer = organizer_result.scalar_one_or_none()
    if not organizer:
        return
    inbox_result = await db.execute(
        select(Folder).where(Folder.user_id == organizer.id, Folder.slug == "inbox")
    )
    inbox = inbox_result.scalar_one_or_none()
    if not inbox:
        return

    now = rl_state.clock.now()
    when = _format_event_when(ev)
    if proposal:
        try:
            ps = datetime.fromisoformat(str(proposal["start_time"]).replace("Z", "+00:00"))
            pe = datetime.fromisoformat(str(proposal["end_time"]).replace("Z", "+00:00"))
            proposed_when = f"{ps.strftime('%a, %b %d, %Y %I:%M %p')} – {pe.strftime('%I:%M %p')}"
        except Exception:
            proposed_when = f"{proposal.get('start_time', '')} – {proposal.get('end_time', '')}"
        subject = f"New time proposed: {ev.title}"
        body_text = f"{responder.display_name} proposed a new time for '{ev.title}'.\n\nProposed: {proposed_when}\nOriginal: {when}"
        body_html = (
            f"<div style='font-family:Segoe UI,Arial,sans-serif;color:#323130;'>"
            f"<p style='margin:0 0 8px 0;color:#605E5C;font-size:12px;'>New time proposed</p>"
            f"<p style='margin:0 0 12px 0;font-size:14px;'><strong>{responder.display_name}</strong> proposed a new time for <strong>{ev.title}</strong>.</p>"
            f"<table style='font-size:13px;line-height:1.5;'>"
            f"<tr><td style='color:#605E5C;padding-right:8px;'>Proposed</td><td>{proposed_when}</td></tr>"
            f"<tr><td style='color:#605E5C;padding-right:8px;'>Original</td><td>{when}</td></tr>"
            f"</table></div>"
        )
    else:
        verb_map = {"accepted": "Accepted", "tentative": "Tentatively accepted", "declined": "Declined"}
        verb = verb_map.get(response or "", "Responded to")
        subject = f"{verb}: {ev.title}"
        body_text = f"{responder.display_name} {verb.lower()} the invitation to '{ev.title}' ({when})."
        body_html = (
            f"<div style='font-family:Segoe UI,Arial,sans-serif;color:#323130;'>"
            f"<p style='margin:0 0 8px 0;color:#605E5C;font-size:12px;'>RSVP update</p>"
            f"<p style='margin:0 0 12px 0;font-size:14px;'><strong>{responder.display_name}</strong> {verb.lower()} the invitation to <strong>{ev.title}</strong>.</p>"
            f"<p style='font-size:13px;color:#605E5C;'>When: {when}</p></div>"
        )

    msg = Message(
        id=uuid.uuid4(),
        user_id=organizer.id,
        folder_id=inbox.id,
        from_address=responder.email,
        from_name=responder.display_name,
        to_addresses=[{"email": organizer.email, "name": organizer.display_name}],
        cc_addresses=[],
        bcc_addresses=[],
        subject=subject,
        body_html=body_html,
        body_text=body_text,
        is_read=False,
        is_draft=False,
        event_id=ev.id,
        sent_at=now,
        received_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(msg)
    await db.flush()


@router.get("/availability")
async def get_availability(
    attendee_emails: str = Query(..., description="Comma-separated emails"),
    start: datetime = Query(...),
    end: datetime = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get free/busy info for attendees in a time range."""
    emails = [e.strip() for e in attendee_emails.split(",")]
    result = []
    for email in emails:
        busy_slots_result = await db.execute(
            select(Event).where(
                Event.user_id == current_user.id,
                Event.start_time < end,
                Event.end_time > start,
                Event.status.in_(["busy", "tentative", "out_of_office"]),
            )
        )
        busy_events = busy_slots_result.scalars().all()
        slots = [
            {
                "start": e.start_time.isoformat(),
                "end": e.end_time.isoformat(),
                "status": e.status,
            }
            for e in busy_events
        ]
        result.append({"attendee": email, "slots": slots})
    return result


@router.get("", response_model=EventList)
async def list_events(
    calendar_id: Optional[uuid.UUID] = None,
    start_after: Optional[datetime] = None,
    start_before: Optional[datetime] = None,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Events I'm invited to but don't own (excluding declined invites — Outlook hides those).
    invited_event_ids_subq = (
        select(EventAttendee.event_id)
        .where(
            EventAttendee.email == current_user.email,
            EventAttendee.response_status != "declined",
        )
        .scalar_subquery()
    )
    ownership_filter = or_(
        Event.user_id == current_user.id,
        Event.id.in_(invited_event_ids_subq),
    )

    # 1. Fetch non-recurring events in the date range
    filters = [ownership_filter, Event.is_recurring.is_(False)]
    if calendar_id:
        filters.append(Event.calendar_id == calendar_id)
    if start_after:
        filters.append(Event.start_time >= start_after)
    if start_before:
        filters.append(Event.start_time <= start_before)

    result = await db.execute(
        select(Event).where(*filters).order_by(Event.start_time)
    )
    non_recurring: list[EventOut] = [EventOut.model_validate(e) for e in result.scalars().all()]

    # 2. Fetch recurring parent events (may start before the requested window)
    rec_filters = [
        ownership_filter,
        Event.is_recurring.is_(True),
        Event.recurrence_parent_id.is_(None),
    ]
    if calendar_id:
        rec_filters.append(Event.calendar_id == calendar_id)
    # Only fetch parents whose start_time is before end of window
    if start_before:
        rec_filters.append(Event.start_time <= start_before)

    rec_result = await db.execute(select(Event).where(*rec_filters))
    recurring_parents = rec_result.scalars().all()

    # 3. Expand each recurring parent into instances within the window
    expanded: list[EventOut] = []
    for parent in recurring_parents:
        if start_after and start_before:
            expanded.extend(_expand_recurring_event(parent, start_after, start_before))
        else:
            expanded.append(EventOut.model_validate(parent))

    # 4. Merge, sort, paginate
    all_items = non_recurring + expanded
    all_items.sort(key=lambda e: e.start_time)
    total = len(all_items)
    page_items = all_items[:limit]

    return EventList(
        items=page_items,
        next_cursor=None,
        total_count=total,
    )


@router.get("/{event_id}", response_model=EventDetail)
async def get_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ev = await _get_event_for_view(db, event_id, current_user)
    attendees_result = await db.execute(
        select(EventAttendee).where(EventAttendee.event_id == event_id)
    )
    attendees = list(attendees_result.scalars().all())

    # Backfill: events created before the organizer-attendee fix don't have a row
    # for the owner. Synthesize one on the fly so invitees can always see who
    # scheduled the meeting. Read-only — not persisted.
    has_organizer = any(a.is_organizer for a in attendees)
    if not has_organizer:
        owner_result = await db.execute(select(User).where(User.id == ev.user_id))
        owner_user = owner_result.scalar_one_or_none()
        if owner_user:
            attendees.insert(0, EventAttendee(
                id=uuid.uuid5(uuid.NAMESPACE_URL, f"{ev.id}/organizer"),
                event_id=ev.id,
                email=owner_user.email,
                display_name=owner_user.display_name,
                is_organizer=True,
                is_required=True,
                response_status="accepted",
            ))

    return EventDetail(
        event=EventOut.model_validate(ev),
        attendees=[EventAttendeeOut.model_validate(a) for a in attendees],
    )


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
async def create_event(
    body: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = rl_state.clock.now()
    ev = Event(
        id=uuid.uuid4(),
        calendar_id=body.calendar_id,
        user_id=current_user.id,
        title=body.title,
        description=body.description,
        location=body.location,
        start_time=body.start_time,
        end_time=body.end_time,
        all_day=body.all_day,
        is_recurring=body.is_recurring,
        recurrence_rule=body.recurrence_rule,
        reminder_minutes=body.reminder_minutes,
        is_online_meeting=body.is_online_meeting,
        meeting_url=body.meeting_url,
        status=body.status,
        sensitivity=body.sensitivity,
        created_at=now,
        updated_at=now,
    )
    db.add(ev)
    await db.flush()

    invitee_emails: list[str] = []
    organizer_in_body = any(
        att.is_organizer or att.email.lower() == current_user.email.lower()
        for att in body.attendees
    )
    for att in body.attendees:
        attendee = EventAttendee(
            id=uuid.uuid4(),
            event_id=ev.id,
            email=att.email,
            display_name=att.display_name,
            is_organizer=att.is_organizer,
            is_required=att.is_required,
        )
        db.add(attendee)
        if not att.is_organizer:
            invitee_emails.append(att.email)

    # Ensure the organizer always has an attendee row so invitees can see who scheduled the event.
    if not organizer_in_body:
        db.add(EventAttendee(
            id=uuid.uuid4(),
            event_id=ev.id,
            email=current_user.email,
            display_name=current_user.display_name,
            is_organizer=True,
            is_required=True,
            response_status="accepted",
        ))

    await db.flush()
    await _send_calendar_invite(db, ev, invitee_emails, current_user, updated=False)
    rl_state.event_log.append("event_created", {"id": str(ev.id), "title": ev.title})
    return EventOut.model_validate(ev)


@router.patch("/{event_id}", response_model=EventOut)
async def update_event(
    event_id: uuid.UUID,
    body: EventUpdate,
    scope: Optional[str] = Query(None, description="single|series"),
    occurrence_start: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ev = await _get_event_or_404(db, event_id, current_user.id)
    now = rl_state.clock.now()

    # Snapshot fields we use to detect material changes (for "Updated:" emails).
    prev_start = ev.start_time
    prev_end = ev.end_time
    prev_location = ev.location
    prev_title = ev.title

    # scope=single: add occurrence to exceptions on parent, create override row
    if scope == "single" and occurrence_start is not None and ev.is_recurring:
        rule = dict(ev.recurrence_rule or {})
        exceptions = list(rule.get("exceptions") or [])
        occ_iso = occurrence_start.isoformat()
        if occ_iso not in exceptions:
            exceptions.append(occ_iso)
        rule["exceptions"] = exceptions
        ev.recurrence_rule = rule
        ev.updated_at = now

        # Create a non-recurring override event for this occurrence
        override = Event(
            id=uuid.uuid4(),
            calendar_id=body.calendar_id if body.calendar_id is not None else ev.calendar_id,
            user_id=ev.user_id,
            title=body.title if body.title is not None else ev.title,
            description=body.description if body.description is not None else ev.description,
            location=body.location if body.location is not None else ev.location,
            start_time=body.start_time if body.start_time is not None else occurrence_start,
            end_time=body.end_time if body.end_time is not None else occurrence_start + (ev.end_time - ev.start_time),
            all_day=body.all_day if body.all_day is not None else ev.all_day,
            is_recurring=False,
            recurrence_parent_id=ev.id,
            reminder_minutes=body.reminder_minutes if body.reminder_minutes is not None else ev.reminder_minutes,
            is_online_meeting=body.is_online_meeting if body.is_online_meeting is not None else ev.is_online_meeting,
            meeting_url=body.meeting_url if body.meeting_url is not None else ev.meeting_url,
            status=body.status if body.status is not None else ev.status,
            sensitivity=body.sensitivity if body.sensitivity is not None else ev.sensitivity,
            created_at=now,
            updated_at=now,
        )
        db.add(override)
        await db.flush()
        rl_state.event_log.append("event_occurrence_updated", {"parent_id": str(ev.id), "override_id": str(override.id)})
        return EventOut.model_validate(override)

    # scope=series or no scope: update the parent (existing behaviour)
    if body.calendar_id is not None:
        ev.calendar_id = body.calendar_id
    if body.title is not None:
        ev.title = body.title
    if body.description is not None:
        ev.description = body.description
    if body.location is not None:
        ev.location = body.location
    if body.start_time is not None:
        ev.start_time = body.start_time
    if body.end_time is not None:
        ev.end_time = body.end_time
    if body.all_day is not None:
        ev.all_day = body.all_day
    if body.is_recurring is not None:
        ev.is_recurring = body.is_recurring
    if body.recurrence_rule is not None:
        ev.recurrence_rule = body.recurrence_rule
    if body.reminder_minutes is not None:
        ev.reminder_minutes = body.reminder_minutes
    if body.is_online_meeting is not None:
        ev.is_online_meeting = body.is_online_meeting
    if body.meeting_url is not None:
        ev.meeting_url = body.meeting_url
    if body.status is not None:
        ev.status = body.status
    if body.sensitivity is not None:
        ev.sensitivity = body.sensitivity

    # Replace attendees if provided. Track which emails are newly added vs already invited
    # so we send "Invitation:" to new ones and "Updated:" to previously invited.
    new_emails: list[str] = []
    existing_emails: list[str] = []
    if body.attendees is not None:
        prev_result = await db.execute(
            select(EventAttendee.email).where(
                EventAttendee.event_id == ev.id,
                EventAttendee.is_organizer.is_(False),
            )
        )
        prev_email_set = {row for row in prev_result.scalars().all()}
        await db.execute(
            EventAttendee.__table__.delete().where(EventAttendee.event_id == ev.id)
        )
        organizer_in_body = any(
            att.is_organizer or att.email.lower() == current_user.email.lower()
            for att in body.attendees
        )
        for att in body.attendees:
            db.add(EventAttendee(
                id=uuid.uuid4(),
                event_id=ev.id,
                email=att.email,
                display_name=att.display_name,
                is_organizer=att.is_organizer,
                is_required=att.is_required,
            ))
            if not att.is_organizer:
                if att.email in prev_email_set:
                    existing_emails.append(att.email)
                else:
                    new_emails.append(att.email)
        # Re-insert the organizer row that the wholesale delete above wiped out.
        if not organizer_in_body:
            db.add(EventAttendee(
                id=uuid.uuid4(),
                event_id=ev.id,
                email=current_user.email,
                display_name=current_user.display_name,
                is_organizer=True,
                is_required=True,
                response_status="accepted",
            ))

    ev.updated_at = now
    await db.flush()

    # If a material field changed (time / title / location), notify every current
    # attendee with an "Updated:" email — covers the case where the organizer accepts
    # a proposed time without touching the attendee list. Clear stale proposals once
    # the new time is committed.
    material_changed = (
        ev.start_time != prev_start
        or ev.end_time != prev_end
        or ev.location != prev_location
        or ev.title != prev_title
    )
    if material_changed:
        att_result = await db.execute(
            select(EventAttendee).where(
                EventAttendee.event_id == ev.id,
                EventAttendee.is_organizer.is_(False),
            )
        )
        all_attendee_rows = att_result.scalars().all()
        all_attendee_emails = [a.email for a in all_attendee_rows]
        # Skip attendees we've already emailed via the new/existing-email branches above.
        already_emailed = set(new_emails) | set(existing_emails)
        material_emails = [e for e in all_attendee_emails if e not in already_emailed]
        if material_emails:
            await _send_calendar_invite(db, ev, material_emails, current_user, updated=True)
        # Time has changed → outstanding proposed_new_time values are no longer relevant.
        # Anyone who proposed a time and now sees the meeting moved is treated as
        # implicitly accepted (their proposal was honored/superseded by the organizer).
        if ev.start_time != prev_start or ev.end_time != prev_end:
            for a in all_attendee_rows:
                if a.proposed_new_time is not None:
                    a.proposed_new_time = None
                    a.response_status = "accepted"
            await db.flush()

    if new_emails:
        await _send_calendar_invite(db, ev, new_emails, current_user, updated=False)
    if existing_emails:
        await _send_calendar_invite(db, ev, existing_emails, current_user, updated=True)
    rl_state.event_log.append("event_updated", {"id": str(ev.id)})
    return EventOut.model_validate(ev)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: uuid.UUID,
    scope: Optional[str] = Query(None, description="single|series"),
    occurrence_start: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ev = await _get_event_or_404(db, event_id, current_user.id)

    # scope=single: add to exceptions so the occurrence is hidden, keep parent
    if scope == "single" and occurrence_start is not None and ev.is_recurring:
        rule = dict(ev.recurrence_rule or {})
        exceptions = list(rule.get("exceptions") or [])
        occ_iso = occurrence_start.isoformat()
        if occ_iso not in exceptions:
            exceptions.append(occ_iso)
        rule["exceptions"] = exceptions
        ev.recurrence_rule = rule
        ev.updated_at = rl_state.clock.now()
        await db.flush()
        rl_state.event_log.append("event_occurrence_deleted", {"parent_id": str(event_id), "occurrence": occ_iso})
        return

    # scope=series or no scope: delete the parent (and cascade overrides)
    await db.delete(ev)
    await db.flush()
    rl_state.event_log.append("event_deleted", {"id": str(event_id)})


@router.post("/{event_id}/respond")
async def respond_to_event(
    event_id: uuid.UUID,
    body: RespondRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ev = await _get_event_for_view(db, event_id, current_user)

    result = await db.execute(
        select(EventAttendee).where(
            EventAttendee.event_id == event_id,
            EventAttendee.email == current_user.email,
        )
    )
    attendee = result.scalar_one_or_none()
    if attendee:
        attendee.response_status = body.response
    else:
        db.add(EventAttendee(
            id=uuid.uuid4(),
            event_id=event_id,
            email=current_user.email,
            display_name=current_user.display_name,
            response_status=body.response,
        ))
    await db.flush()
    await _notify_organizer_response(db, ev, current_user, body.response, None)
    rl_state.event_log.append("event_responded", {"event_id": str(event_id), "response": body.response})
    return {"status": "ok", "response": body.response}


@router.post("/{event_id}/propose-time")
async def propose_new_time(
    event_id: uuid.UUID,
    body: ProposeTimeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ev = await _get_event_for_view(db, event_id, current_user)

    result = await db.execute(
        select(EventAttendee).where(
            EventAttendee.event_id == event_id,
            EventAttendee.email == current_user.email,
        )
    )
    attendee = result.scalar_one_or_none()
    proposal = {"start_time": body.start_time.isoformat(), "end_time": body.end_time.isoformat()}
    if attendee:
        attendee.proposed_new_time = proposal
    else:
        db.add(EventAttendee(
            id=uuid.uuid4(),
            event_id=event_id,
            email=current_user.email,
            display_name=current_user.display_name,
            proposed_new_time=proposal,
        ))
    await db.flush()
    await _notify_organizer_response(db, ev, current_user, None, proposal)
    rl_state.event_log.append("time_proposed", {"event_id": str(event_id), "proposal": proposal})
    return {"status": "ok", "proposed": proposal}
