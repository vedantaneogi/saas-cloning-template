"""
Seed loader: takes a validated SeedPayload and writes all entities into the DB.
Designed to be idempotent (clears existing user data then re-inserts).
"""
from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.calendar import Calendar, Event, EventAttendee
from app.models.category import Category
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.folder import Folder
from app.models.message import Attachment, Message, MessageCategory
from app.models.rule import Rule
from app.models.signature import Signature
from app.models.task import Task, TaskList
from app.models.user import User
from app.rl.state import rl_state
from app.schemas.seed import SeedPayload


SYSTEM_FOLDERS = [
    {"name": "Inbox", "slug": "inbox", "icon": "inbox", "sort_order": 0},
    {"name": "Drafts", "slug": "drafts", "icon": "file-text", "sort_order": 1},
    {"name": "Sent Items", "slug": "sent", "icon": "send", "sort_order": 2},
    {"name": "Archive", "slug": "archive", "icon": "archive", "sort_order": 3},
    {"name": "Junk Email", "slug": "junk", "icon": "alert-triangle", "sort_order": 4},
    {"name": "Deleted Items", "slug": "deleted", "icon": "trash-2", "sort_order": 5},
]

DEFAULT_CATEGORIES = [
    {"name": "Blue Category", "color": "#0078D4"},
    {"name": "Green Category", "color": "#107C10"},
    {"name": "Orange Category", "color": "#FF8C00"},
    {"name": "Purple Category", "color": "#5C2D91"},
    {"name": "Red Category", "color": "#D13438"},
    {"name": "Yellow Category", "color": "#FFB900"},
]


def _parse_dt(value: Optional[str], randomize_time: bool = False) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if randomize_time:
            dt = dt.replace(hour=random.randint(6, 22), minute=random.randint(0, 59), second=random.randint(0, 59))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def _uuid(value: Optional[str]) -> uuid.UUID:
    if value:
        try:
            return uuid.UUID(value)
        except ValueError:
            pass
    return uuid.uuid4()


async def clear_user_data(session: AsyncSession, user_id: uuid.UUID) -> None:
    """Delete all owned data for a user (cascade should handle most FKs)."""
    # Order matters due to FK constraints not always having cascade
    await session.execute(delete(MessageCategory).where(
        MessageCategory.message_id.in_(
            select(Message.id).where(Message.user_id == user_id)
        )
    ))
    await session.execute(delete(Attachment).where(
        Attachment.message_id.in_(
            select(Message.id).where(Message.user_id == user_id)
        )
    ))
    await session.execute(delete(Message).where(Message.user_id == user_id))
    await session.execute(delete(Conversation).where(Conversation.user_id == user_id))
    await session.execute(delete(EventAttendee).where(
        EventAttendee.event_id.in_(
            select(Event.id).where(Event.user_id == user_id)
        )
    ))
    await session.execute(delete(Event).where(Event.user_id == user_id))
    await session.execute(delete(Calendar).where(Calendar.user_id == user_id))
    await session.execute(delete(Task).where(Task.user_id == user_id))
    await session.execute(delete(TaskList).where(TaskList.user_id == user_id))
    await session.execute(delete(Rule).where(Rule.user_id == user_id))
    await session.execute(delete(Signature).where(Signature.user_id == user_id))
    await session.execute(delete(Category).where(Category.user_id == user_id))
    await session.execute(delete(Contact).where(Contact.user_id == user_id))
    await session.execute(delete(Folder).where(Folder.user_id == user_id))


async def load_seed(session: AsyncSession, payload: SeedPayload) -> dict[str, int]:
    """
    Load all seed data into the database.
    Returns entity counts.
    """
    # Seed the global PRNG for determinism — same rng_seed → same random outputs
    random.seed(payload.rng_seed)

    app = payload.app_data
    world = payload.world
    now = rl_state.clock.now()

    # ------------------------------------------------------------------
    # 1. Resolve active user from world
    # ------------------------------------------------------------------
    world_person = next(
        (p for p in world.people if p.id == app.active_user.world_id),
        None,
    )
    if world_person is None and world.people:
        world_person = world.people[0]

    # Check if user already exists
    result = await session.execute(
        select(User).where(User.world_id == app.active_user.world_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            id=uuid.uuid4(),
            world_id=app.active_user.world_id,
            email=world_person.email if world_person else f"{app.active_user.world_id}@example.com",
            display_name=f"{world_person.first_name} {world_person.last_name}" if world_person else "Active User",
            avatar_url=world_person.avatar_url if world_person else None,
            timezone=app.active_user.timezone,
            locale=app.active_user.locale,
            role=app.active_user.role,
            hashed_password=hash_password(app.active_user.password or "password123"),
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        session.add(user)
    else:
        user.role = app.active_user.role
        user.timezone = app.active_user.timezone
        user.locale = app.active_user.locale
        user.updated_at = now
        if app.active_user.password:
            user.hashed_password = hash_password(app.active_user.password)

    await session.flush()
    await clear_user_data(session, user.id)
    await session.flush()

    rl_state.active_user_id = str(user.id)

    # ------------------------------------------------------------------
    # 1b. Create accounts for ALL world people (for multi-account testing)
    # ------------------------------------------------------------------
    extra_users_created = 0
    for person in world.people:
        if person.id == app.active_user.world_id:
            continue  # Skip active user (already created above)
        existing = await session.execute(select(User).where(User.email == person.email))
        if existing.scalar_one_or_none():
            continue
        extra_user = User(
            id=uuid.uuid4(),
            world_id=person.id,
            email=person.email,
            display_name=f"{person.first_name} {person.last_name}",
            avatar_url=person.avatar_url,
            timezone="America/New_York",
            locale="en-US",
            role="worker",
            hashed_password=hash_password("password123"),
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        session.add(extra_user)
        await session.flush()
        # Create system folders for extra user
        for sf in SYSTEM_FOLDERS:
            session.add(Folder(
                id=uuid.uuid4(),
                user_id=extra_user.id,
                name=sf["name"],
                slug=sf["slug"],
                is_system=True,
                icon=sf["icon"],
                sort_order=sf["sort_order"],
                created_at=now,
                updated_at=now,
            ))
        extra_users_created += 1
    if extra_users_created:
        await session.flush()

    # OOF settings
    oof = app.out_of_office
    if oof:
        user.out_of_office_enabled = oof.enabled
        user.out_of_office_start = _parse_dt(oof.start)
        user.out_of_office_end = _parse_dt(oof.end)
        user.out_of_office_message_internal = oof.internal_message
        user.out_of_office_message_external = oof.external_message

    # ------------------------------------------------------------------
    # 2. System folders
    # ------------------------------------------------------------------
    folder_map: dict[str, uuid.UUID] = {}  # slug -> id
    folder_name_map: dict[str, uuid.UUID] = {}  # name -> id

    for sf in SYSTEM_FOLDERS:
        fid = uuid.uuid4()
        folder = Folder(
            id=fid,
            user_id=user.id,
            name=sf["name"],
            slug=sf["slug"],
            is_system=True,
            icon=sf["icon"],
            sort_order=sf["sort_order"],
            created_at=now,
            updated_at=now,
        )
        session.add(folder)
        folder_map[sf["slug"]] = fid
        folder_name_map[sf["name"]] = fid

    await session.flush()

    # ------------------------------------------------------------------
    # 3. Custom folders from seed
    # ------------------------------------------------------------------
    # Two-pass: first pass creates folders, second resolves parents
    seed_folder_id_map: dict[str, uuid.UUID] = {}  # seed name -> uuid

    for sf in app.folders:
        fid = _uuid(sf.id) if sf.id else uuid.uuid4()
        folder = Folder(
            id=fid,
            user_id=user.id,
            name=sf.name,
            slug=sf.slug,
            is_system=False,
            icon=sf.icon,
            sort_order=sf.sort_order,
            created_at=now,
            updated_at=now,
        )
        session.add(folder)
        seed_folder_id_map[sf.name] = fid
        if sf.slug:
            folder_map[sf.slug] = fid
        folder_name_map[sf.name] = fid

    await session.flush()

    # Resolve parents
    for sf in app.folders:
        if sf.parent:
            parent_id = folder_name_map.get(sf.parent) or seed_folder_id_map.get(sf.parent)
            if parent_id:
                result = await session.execute(
                    select(Folder).where(Folder.id == seed_folder_id_map.get(sf.name))
                )
                f = result.scalar_one_or_none()
                if f:
                    f.parent_id = parent_id

    await session.flush()

    def resolve_folder_id(ref: str) -> Optional[uuid.UUID]:
        """Resolve a folder reference (slug, name, or UUID string) to UUID."""
        if not ref:
            return folder_map.get("inbox")
        # Try slug
        if ref in folder_map:
            return folder_map[ref]
        # Try name
        if ref in folder_name_map:
            return folder_name_map[ref]
        # Try UUID
        try:
            return uuid.UUID(ref)
        except ValueError:
            return folder_map.get("inbox")

    # ------------------------------------------------------------------
    # 4. Categories
    # ------------------------------------------------------------------
    category_map: dict[str, uuid.UUID] = {}  # name -> id

    cats = app.categories if app.categories else [
        type("C", (), {"id": None, "name": d["name"], "color": d["color"]})()
        for d in DEFAULT_CATEGORIES
    ]
    if not cats:
        cats = [
            type("C", (), {"id": None, "name": d["name"], "color": d["color"]})()
            for d in DEFAULT_CATEGORIES
        ]

    for sc in cats:
        cid = _uuid(sc.id) if sc.id else uuid.uuid4()
        cat = Category(id=cid, user_id=user.id, name=sc.name, color=sc.color, created_at=now)
        session.add(cat)
        category_map[sc.name] = cid

    await session.flush()

    # ------------------------------------------------------------------
    # 5. Contacts
    # ------------------------------------------------------------------
    for sc in app.contacts:
        cid = _uuid(sc.id) if sc.id else uuid.uuid4()
        display = sc.display_name or f"{sc.first_name} {sc.last_name or ''}".strip()
        contact = Contact(
            id=cid,
            user_id=user.id,
            world_id=sc.world_id,
            first_name=sc.first_name,
            last_name=sc.last_name,
            display_name=display,
            email=sc.email,
            phone=sc.phone,
            company=sc.company,
            job_title=sc.job_title,
            address=sc.address,
            notes=sc.notes,
            avatar_url=sc.avatar_url,
            is_favorite=sc.is_favorite,
            created_at=now,
            updated_at=now,
        )
        session.add(contact)

    await session.flush()

    # ------------------------------------------------------------------
    # 6. Conversations
    # ------------------------------------------------------------------
    conv_map: dict[str, uuid.UUID] = {}  # seed id/subject -> uuid

    for sc in app.conversations:
        cid = _uuid(sc.id) if sc.id else uuid.uuid4()
        conv = Conversation(
            id=cid,
            user_id=user.id,
            subject=sc.subject,
            message_count=sc.message_count,
            has_attachments=sc.has_attachments,
            last_message_at=_parse_dt(sc.last_message_at),
            created_at=now,
            updated_at=now,
        )
        session.add(conv)
        if sc.id:
            conv_map[sc.id] = cid
        conv_map[sc.subject] = cid

    await session.flush()

    # ------------------------------------------------------------------
    # 7. Messages
    # ------------------------------------------------------------------
    message_map: dict[str, uuid.UUID] = {}  # seed id -> uuid

    for sm in app.messages:
        mid = _uuid(sm.id) if sm.id else uuid.uuid4()
        fid = resolve_folder_id(sm.folder)
        conv_id: Optional[uuid.UUID] = None
        if sm.conversation_id:
            conv_id = conv_map.get(sm.conversation_id) or _uuid(sm.conversation_id)

        msg = Message(
            id=mid,
            user_id=user.id,
            folder_id=fid,
            conversation_id=conv_id,
            from_address=sm.from_address,
            from_name=sm.from_name,
            to_addresses=sm.to_addresses,
            cc_addresses=sm.cc_addresses,
            bcc_addresses=sm.bcc_addresses,
            subject=sm.subject,
            body_text=sm.body_text,
            body_html=sm.body_html,
            is_read=sm.is_read,
            is_flagged=sm.is_flagged,
            is_pinned=sm.is_pinned,
            is_draft=sm.is_draft,
            importance=sm.importance,
            sensitivity=sm.sensitivity,
            has_attachments=sm.has_attachments,
            reply_type=sm.reply_type,
            sent_at=_parse_dt(sm.sent_at, randomize_time=True),
            received_at=_parse_dt(sm.received_at, randomize_time=True),
            snooze_until=_parse_dt(sm.snooze_until),
            scheduled_send_at=_parse_dt(sm.scheduled_send_at),
            created_at=now,
            updated_at=now,
        )
        session.add(msg)
        if sm.id:
            message_map[sm.id] = mid

    await session.flush()

    # Resolve in_reply_to_id after all messages are flushed
    for sm in app.messages:
        if sm.in_reply_to_id and sm.id and sm.id in message_map:
            reply_to = message_map.get(sm.in_reply_to_id)
            if reply_to:
                result = await session.execute(select(Message).where(Message.id == message_map[sm.id]))
                m = result.scalar_one_or_none()
                if m:
                    m.in_reply_to_id = reply_to

    # ------------------------------------------------------------------
    # 8. Attachments
    # ------------------------------------------------------------------
    # Lazy import keeps seed_loader free of route-layer deps in test contexts.
    from pathlib import Path
    from app.api.routes.messages import _attachment_store
    samples_dir = Path(__file__).resolve().parents[2] / "seeds" / "samples"

    for sa in app.attachments:
        aid = _uuid(sa.id) if sa.id else uuid.uuid4()
        msg_id = message_map.get(sa.message_id) or _uuid(sa.message_id)
        # If sample_file is set, load real bytes from disk so previews render.
        size_bytes = sa.size_bytes
        if sa.sample_file:
            sample_path = samples_dir / sa.sample_file
            if sample_path.is_file():
                content = sample_path.read_bytes()
                _attachment_store[str(aid)] = content
                size_bytes = len(content)
        att = Attachment(
            id=aid,
            message_id=msg_id,
            filename=sa.filename,
            content_type=sa.content_type,
            size_bytes=size_bytes,
            storage_path=sa.storage_path,
            is_inline=sa.is_inline,
            created_at=now,
        )
        session.add(att)

    await session.flush()

    # ------------------------------------------------------------------
    # 9. Calendars
    # ------------------------------------------------------------------
    calendar_map: dict[str, uuid.UUID] = {}  # name -> id

    for sc in app.calendars:
        cal_id = _uuid(sc.id) if sc.id else uuid.uuid4()
        cal = Calendar(
            id=cal_id,
            user_id=user.id,
            name=sc.name,
            color=sc.color,
            is_default=sc.is_default,
            is_visible=sc.is_visible,
            created_at=now,
            updated_at=now,
        )
        session.add(cal)
        calendar_map[sc.name] = cal_id

    await session.flush()

    # ------------------------------------------------------------------
    # 10. Events
    # ------------------------------------------------------------------
    for se in app.events:
        eid = _uuid(se.id) if se.id else uuid.uuid4()
        cal_id = calendar_map.get(se.calendar) or _uuid(se.calendar)

        event = Event(
            id=eid,
            calendar_id=cal_id,
            user_id=user.id,
            title=se.title,
            description=se.description,
            location=se.location,
            start_time=_parse_dt(se.start_time) or now,
            end_time=_parse_dt(se.end_time) or now,
            all_day=se.all_day,
            is_recurring=se.is_recurring,
            recurrence_rule=se.recurrence_rule,
            reminder_minutes=se.reminder_minutes,
            is_online_meeting=se.is_online_meeting,
            meeting_url=se.meeting_url,
            status=se.status,
            sensitivity=se.sensitivity,
            created_at=now,
            updated_at=now,
        )
        session.add(event)
        await session.flush()

        for sa in se.attendees:
            attendee = EventAttendee(
                id=uuid.uuid4(),
                event_id=eid,
                email=sa.email,
                display_name=sa.display_name,
                response_status=sa.response_status,
                is_organizer=sa.is_organizer,
                is_required=sa.is_required,
            )
            session.add(attendee)

    await session.flush()

    # ------------------------------------------------------------------
    # 11. Task lists
    # ------------------------------------------------------------------
    task_list_map: dict[str, uuid.UUID] = {}

    for stl in app.task_lists:
        tlid = _uuid(stl.id) if stl.id else uuid.uuid4()
        tl = TaskList(
            id=tlid,
            user_id=user.id,
            name=stl.name,
            is_default=stl.is_default,
            color=stl.color,
            sort_order=stl.sort_order,
            created_at=now,
        )
        session.add(tl)
        task_list_map[stl.name] = tlid

    await session.flush()

    # ------------------------------------------------------------------
    # 12. Tasks
    # ------------------------------------------------------------------
    for st in app.tasks:
        tid = _uuid(st.id) if st.id else uuid.uuid4()
        list_id = task_list_map.get(st.list_name) if st.list_name else None
        src_msg_id = message_map.get(st.source_message_id) if st.source_message_id else None

        task = Task(
            id=tid,
            user_id=user.id,
            list_id=list_id,
            title=st.title,
            body=st.body,
            is_completed=st.is_completed,
            completed_at=now if st.is_completed else None,
            due_date=_parse_dt(st.due_date).date() if st.due_date else None,
            reminder_at=_parse_dt(st.reminder_at),
            importance=st.importance,
            source_message_id=src_msg_id,
            sort_order=st.sort_order,
            created_at=now,
            updated_at=now,
        )
        session.add(task)

    await session.flush()

    # ------------------------------------------------------------------
    # 13. Rules
    # ------------------------------------------------------------------
    for sr in app.rules:
        rid = _uuid(sr.id) if sr.id else uuid.uuid4()
        rule = Rule(
            id=rid,
            user_id=user.id,
            name=sr.name,
            is_enabled=sr.is_enabled,
            priority=sr.priority,
            conditions=sr.conditions,
            actions=sr.actions,
            stop_processing=sr.stop_processing,
            apply_to=sr.apply_to,
            created_at=now,
            updated_at=now,
        )
        session.add(rule)

    await session.flush()

    # ------------------------------------------------------------------
    # 14. Signatures
    # ------------------------------------------------------------------
    for ss in app.signatures:
        sid = _uuid(ss.id) if ss.id else uuid.uuid4()
        # Replace template variables
        display_name = user.display_name
        body = ss.body_html.replace("{user.display_name}", display_name)
        if world_person:
            body = body.replace("{user.job_title}", world_person.job_title or "")
            body = body.replace("{user.company}", world_person.company or "")
            body = body.replace("{user.email}", user.email)
            body = body.replace("{user.phone}", world_person.phone or "")
            body = body.replace("{user.first_name}", world_person.first_name)

        sig = Signature(
            id=sid,
            user_id=user.id,
            name=ss.name,
            body_html=body,
            is_default_new=ss.is_default_new,
            is_default_reply=ss.is_default_reply,
            created_at=now,
            updated_at=now,
        )
        session.add(sig)

    await session.flush()

    # ------------------------------------------------------------------
    # Update folder counts
    # ------------------------------------------------------------------
    # Get all folders for this user and recount
    folders_result = await session.execute(select(Folder).where(Folder.user_id == user.id))
    all_folders = folders_result.scalars().all()

    for folder in all_folders:
        total_result = await session.execute(
            select(Message).where(Message.folder_id == folder.id)
        )
        total_msgs = total_result.scalars().all()
        folder.total_count = len(total_msgs)
        folder.unread_count = sum(1 for m in total_msgs if not m.is_read)

    await session.flush()

    # ------------------------------------------------------------------
    # Entity counts
    # ------------------------------------------------------------------
    counts = {
        "users": 1 + extra_users_created,
        "folders": len(all_folders),
        "messages": len(app.messages),
        "conversations": len(app.conversations),
        "contacts": len(app.contacts),
        "calendars": len(app.calendars),
        "events": len(app.events),
        "task_lists": len(app.task_lists),
        "tasks": len(app.tasks),
        "rules": len(app.rules),
        "categories": len(cats),
        "signatures": len(app.signatures),
        "attachments": len(app.attachments),
    }

    return counts
