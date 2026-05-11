import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File as FastAPIFile, status
from fastapi.responses import Response
from sqlalchemy import and_, cast, desc, func, or_, select, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.category import Category
from app.models.folder import Folder
from app.models.message import Attachment, Message, MessageCategory
from app.models.user import User
# In-memory attachment content store (keyed by attachment UUID)
_attachment_store: dict[str, bytes] = {}

from app.rl.state import rl_state
from app.schemas.message import (
    AttachmentOut,
    BulkRequest,
    CategoryOut,
    ForwardRequest,
    MessageCreate,
    MessageList,
    MessageOut,
    MessageUpdate,
    MoveRequest,
    ReplyRequest,
    CleanUpThreadRequest,
    SweepKeepLatestRequest,
    SweepMoveAllRequest,
)

router = APIRouter(prefix="/messages", tags=["Messages"])


def _err(code: str, message: str, status_code: int = 400):
    raise HTTPException(
        status_code=status_code,
        detail={"error": {"code": code, "message": message}},
    )


async def _get_message_or_404(db: AsyncSession, message_id: uuid.UUID, user_id: uuid.UUID) -> Message:
    result = await db.execute(
        select(Message).where(Message.id == message_id, Message.user_id == user_id)
    )
    msg = result.scalar_one_or_none()
    if not msg:
        _err("not_found", "Message not found", 404)
    return msg


async def _get_folder_by_slug(db: AsyncSession, slug: str, user_id: uuid.UUID) -> Optional[Folder]:
    result = await db.execute(
        select(Folder).where(Folder.slug == slug, Folder.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def _deliver_to_recipients(
    db: AsyncSession, sent_msg: Message, to_addresses: list, cc_addresses: list, bcc_addresses: list, sender: User
):
    """
    Deliver message to recipients:
    1. Internal users (in our DB) → create DB record in their inbox (instant UI)
    2. All recipients → send real email via Resend (if configured)
    """
    all_recipients = list(to_addresses or []) + list(cc_addresses or []) + list(bcc_addresses or [])
    now = rl_state.clock.now()

    # Group fan-out: any recipient whose address matches a Group.email gets
    # expanded to that group's members, so a message to "team-a@company.com"
    # actually lands in every member's inbox. The original to/cc keeps the
    # group address visible so Reply / Reply All still target the group.
    from app.models.group import Group, GroupMember
    rec_emails_lower = {
        (r.get("email", "") if isinstance(r, dict) else "").lower()
        for r in all_recipients
    }
    rec_emails_lower.discard("")
    if rec_emails_lower:
        group_q = await db.execute(
            select(Group).where(Group.email.in_(rec_emails_lower))
        )
        for g in group_q.scalars().all():
            members_q = await db.execute(
                select(User)
                .join(GroupMember, GroupMember.user_id == User.id)
                .where(GroupMember.group_id == g.id)
            )
            for m in members_q.scalars().all():
                # Deduplicate against existing recipients (case-insensitive).
                if m.email.lower() in rec_emails_lower:
                    continue
                rec_emails_lower.add(m.email.lower())
                all_recipients.append({"email": m.email, "name": m.display_name})

    # Internal DB delivery for users in our system
    for recipient in all_recipients:
        rec_email = recipient.get("email", "") if isinstance(recipient, dict) else ""
        if not rec_email or rec_email == sender.email:
            continue
        rec_user_result = await db.execute(select(User).where(User.email == rec_email))
        rec_user = rec_user_result.scalar_one_or_none()
        if not rec_user:
            continue
        rec_inbox = await _get_folder_by_slug(db, "inbox", rec_user.id)
        if not rec_inbox:
            continue
        delivered = Message(
            id=uuid.uuid4(),
            user_id=rec_user.id,
            folder_id=rec_inbox.id,
            conversation_id=sent_msg.conversation_id,
            in_reply_to_id=sent_msg.in_reply_to_id,
            reply_type=sent_msg.reply_type,
            from_address=sender.email,
            from_name=sender.display_name,
            to_addresses=to_addresses,
            cc_addresses=cc_addresses,
            bcc_addresses=[],
            subject=sent_msg.subject,
            body_html=sent_msg.body_html,
            body_text=sent_msg.body_text,
            importance=sent_msg.importance,
            sensitivity=sent_msg.sensitivity,
            encrypt_mode=sent_msg.encrypt_mode,
            has_attachments=sent_msg.has_attachments,
            is_read=False,
            is_draft=False,
            sent_at=sent_msg.sent_at,
            received_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add(delivered)
        await db.flush()
        # Auto-run the recipient's enabled inbound rules against the freshly
        # delivered copy. Rules can move the message to a folder, mark it
        # read, flag, set importance, etc. — same behaviour as Outlook's
        # server-side inbox rules. Imported lazily to avoid circular imports.
        from app.api.routes.rules import _message_matches_condition, _apply_rule_to_message
        from app.models.rule import Rule
        rules_q = await db.execute(
            select(Rule)
            .where(
                Rule.user_id == rec_user.id,
                Rule.is_enabled.is_(True),
                Rule.apply_to.in_(("incoming", "both")),
            )
            .order_by(Rule.priority)
        )
        for r in rules_q.scalars().all():
            conds = r.conditions or []
            excs = getattr(r, "exceptions", None) or []
            if not all(_message_matches_condition(delivered, c, rec_email) for c in conds):
                continue
            if excs and any(_message_matches_condition(delivered, e, rec_email) for e in excs):
                continue
            await _apply_rule_to_message(db, r, delivered, rec_user.id)
            if r.stop_processing:
                break
        await db.flush()
        await _update_folder_counts(db, rec_inbox.id)
        rl_state.event_log.append("message_delivered", {
            "id": str(delivered.id), "from": sender.email, "to": rec_email,
        })

    # Real email delivery via Resend
    try:
        from app.core.email import send_email
        from app.core.config import settings
        result = await send_email(
            from_name=sender.display_name,
            from_email=sender.email,
            to_addresses=to_addresses,
            cc_addresses=cc_addresses,
            bcc_addresses=bcc_addresses,
            subject=sent_msg.subject,
            body_html=sent_msg.body_html or "",
            reply_to=sender.email,
            from_domain=settings.RESEND_FROM_DOMAIN,
        )
        if result:
            rl_state.event_log.append("email_sent_resend", {
                "resend_id": result.get("id", ""),
                "to": [a.get("email", "") for a in to_addresses],
            })
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Resend delivery failed: {e}")


async def _update_folder_counts(db: AsyncSession, folder_id: uuid.UUID):
    result = await db.execute(select(Folder).where(Folder.id == folder_id))
    folder = result.scalar_one_or_none()
    if folder:
        total_result = await db.execute(select(func.count()).where(Message.folder_id == folder_id))
        unread_result = await db.execute(
            select(func.count()).where(Message.folder_id == folder_id, Message.is_read == False)  # noqa: E712
        )
        folder.total_count = total_result.scalar() or 0
        folder.unread_count = unread_result.scalar() or 0


async def _flush_due_scheduled(db: AsyncSession, user: User) -> None:
    """Dispatch any of the user's scheduled messages whose send time has passed.

    Schedule-send stores the message as is_draft=True with scheduled_send_at
    populated. This helper finds those that are due, flips them to "sent",
    moves them into the Sent folder, runs OOF + delivery, and clears the
    scheduled flag. Called opportunistically from list_messages so we don't
    need a background worker.
    """
    now = rl_state.clock.now()
    # Skip messages the user has soft-deleted before dispatch — moving the
    # scheduled item to Deleted Items is the user's "cancel" affordance.
    deleted_folder = await _get_folder_by_slug(db, "deleted", user.id)
    where_clauses = [
        Message.user_id == user.id,
        Message.is_draft.is_(True),
        Message.scheduled_send_at.is_not(None),
        Message.scheduled_send_at <= now,
    ]
    if deleted_folder:
        where_clauses.append(Message.folder_id != deleted_folder.id)
    due_q = await db.execute(select(Message).where(*where_clauses))
    due = list(due_q.scalars().all())
    if not due:
        return
    sent_folder = await _get_folder_by_slug(db, "sent", user.id)
    for msg in due:
        prev_folder_id = msg.folder_id
        if sent_folder:
            msg.folder_id = sent_folder.id
        msg.is_draft = False
        msg.sent_at = now
        msg.received_at = now
        msg.updated_at = now
        msg.scheduled_send_at = None
        await db.flush()
        if sent_folder and sent_folder.id != prev_folder_id:
            await _update_folder_counts(db, prev_folder_id)
            await _update_folder_counts(db, sent_folder.id)
        await _deliver_to_recipients(
            db, msg, msg.to_addresses, msg.cc_addresses, msg.bcc_addresses, user
        )
        rl_state.event_log.append("scheduled_send_dispatched", {"id": str(msg.id)})


async def _flush_due_boomerangs(db: AsyncSession, user: User) -> None:
    """Resurface sent messages whose follow-up reminder has matured.

    Boomerang stores `boomerang_at` on the original sent message. When
    `now >= boomerang_at` and no reply has arrived on the same conversation,
    we drop a copy of the original into the user's Inbox as
    unread + flagged + pinned (so it sticks to the top), with subject
    prefixed "Follow-up:". `boomerang_fired_at` is stamped either way so the
    sweep is idempotent. Called opportunistically from list_messages — same
    pattern as `_flush_due_scheduled`, no background worker.
    """
    now = rl_state.clock.now()
    sent_folder = await _get_folder_by_slug(db, "sent", user.id)
    inbox_folder = await _get_folder_by_slug(db, "inbox", user.id)
    if not sent_folder or not inbox_folder:
        return
    due_q = await db.execute(
        select(Message)
        .where(
            Message.user_id == user.id,
            Message.folder_id == sent_folder.id,
            Message.is_draft.is_(False),
            Message.boomerang_at.is_not(None),
            Message.boomerang_at <= now,
            Message.boomerang_fired_at.is_(None),
        )
        .options(selectinload(Message.attachments))
    )
    due = list(due_q.scalars().all())
    if not due:
        return
    for sent_msg in due:
        # Reply detection by conversation: any non-Sent message in the
        # user's mailbox sharing this conversation_id is treated as a
        # reply (covers external replies that flowed back via the
        # recipient delivery loop). conversation_id can be NULL for very
        # old messages — those fall back to in_reply_to_id matching.
        reply_count = 0
        if sent_msg.conversation_id is not None:
            r = await db.execute(
                select(func.count())
                .select_from(Message)
                .where(
                    Message.user_id == user.id,
                    Message.conversation_id == sent_msg.conversation_id,
                    Message.id != sent_msg.id,
                    Message.folder_id != sent_folder.id,
                )
            )
            reply_count = r.scalar() or 0
        if reply_count > 0:
            sent_msg.boomerang_fired_at = now
            sent_msg.updated_at = now
            rl_state.event_log.append(
                "boomerang_cleared_by_reply", {"id": str(sent_msg.id)}
            )
            continue
        # No reply — drop a Boomerang-style notice in Inbox. Per senior
        # follow-up: the resurfaced row is a self-to-self message (from
        # the user, to the user — no external recipients, no SMTP send).
        # Subject is "RE: {original}" so it visually threads with the
        # original conversation. Body is the Boomerang notice + a
        # "view this conversation" link. is_flagged + is_pinned put it
        # at the top of Inbox with a red follow-up flag.
        original_subject = sent_msg.subject or ""
        reminder_subject = (
            f"RE: {original_subject}" if original_subject else "Follow-up reminder"
        )
        view_url = f"/mail/sent?msg_id={sent_msg.id}"
        notice_html = (
            "<p>Message moved to top of Inbox by Boomerang because there "
            f"was no reply <a href=\"{view_url}\">(view this conversation)</a>.</p>"
            "<p style=\"color:#605E5C;font-size:12px;margin-top:12px;\">"
            "Don't want this notification in the future? Go to Settings and "
            "uncheck the checkbox for <em>At the top of Inbox</em>. Please note "
            "that your Boomeranged messages would no longer return to the "
            "top of your inbox.</p>"
        )
        notice_text = (
            "Message moved to top of Inbox by Boomerang because there was no "
            f"reply (view this conversation: {view_url}).\n\n"
            "Don't want this notification in the future? Go to Settings and "
            "uncheck \"At the top of Inbox\"."
        )
        self_to = [{"email": user.email, "name": user.display_name or user.email}]
        reminder = Message(
            id=uuid.uuid4(),
            user_id=user.id,
            folder_id=inbox_folder.id,
            conversation_id=sent_msg.conversation_id,
            in_reply_to_id=sent_msg.id,
            from_address=user.email,            # self-to-self — clearly internal
            from_name=user.display_name or user.email,
            to_addresses=self_to,
            cc_addresses=[],
            bcc_addresses=[],
            subject=reminder_subject,
            body_html=notice_html,
            body_text=notice_text,
            importance="normal",
            sensitivity="normal",
            encrypt_mode="none",
            has_attachments=False,
            is_read=False,
            is_flagged=True,                    # red follow-up flag on the row
            is_pinned=True,                     # forces it to the top of Inbox
            is_draft=False,
            sent_at=now,
            received_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add(reminder)
        sent_msg.boomerang_fired_at = now
        sent_msg.updated_at = now
        await db.flush()
        await _update_folder_counts(db, inbox_folder.id)
        rl_state.event_log.append("boomerang_fired", {"id": str(sent_msg.id), "reminder_id": str(reminder.id)})


@router.get("", response_model=MessageList)
async def list_messages(
    folder_id: Optional[uuid.UUID] = None,
    conversation_id: Optional[uuid.UUID] = None,
    is_read: Optional[bool] = None,
    is_flagged: Optional[bool] = None,
    importance: Optional[str] = None,
    search: Optional[str] = None,
    from_addr: Optional[str] = None,
    focused: Optional[bool] = None,
    snoozed: Optional[bool] = None,
    mentions_only: Optional[bool] = None,
    category_ids: list[uuid.UUID] = Query(default=[]),
    sort: str = "received_at:desc",
    cursor: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Flush any scheduled messages whose send time has passed before listing.
    await _flush_due_scheduled(db, current_user)
    await _flush_due_boomerangs(db, current_user)

    filters = [Message.user_id == current_user.id]
    if folder_id:
        filters.append(Message.folder_id == folder_id)
    if conversation_id:
        filters.append(Message.conversation_id == conversation_id)
    if is_read is not None:
        filters.append(Message.is_read == is_read)
    if is_flagged is not None:
        filters.append(Message.is_flagged == is_flagged)
    if importance:
        filters.append(Message.importance == importance)
    if from_addr:
        filters.append(Message.from_address.ilike(f"%{from_addr}%"))
    if category_ids:
        # Filter to messages tagged with any of the requested categories.
        cat_subq = (
            select(MessageCategory.message_id)
            .where(MessageCategory.category_id.in_(category_ids))
            .scalar_subquery()
        )
        filters.append(Message.id.in_(cat_subq))

    # Focused inbox: messages from known contacts or with high importance are "focused"
    if focused is not None:
        from app.models.contact import Contact
        contact_emails_subq = (
            select(Contact.email)
            .where(Contact.user_id == current_user.id, Contact.email.is_not(None))
            .scalar_subquery()
        )
        if focused:
            # Focused = known contact / high importance / flagged / reply / **calendar** —
            # invites + RSVP notifications always belong in Focused, never Other.
            filters.append(
                or_(
                    Message.from_address.in_(contact_emails_subq),
                    Message.importance == "high",
                    Message.is_flagged.is_(True),
                    Message.in_reply_to_id.is_not(None),
                    Message.event_id.is_not(None),
                )
            )
        else:
            # Other = the inverse of the focused predicate (calendar messages are
            # explicitly excluded so they never leak into Other).
            filters.append(
                ~or_(
                    Message.from_address.in_(contact_emails_subq),
                    Message.importance == "high",
                    Message.is_flagged.is_(True),
                    Message.in_reply_to_id.is_not(None),
                    Message.event_id.is_not(None),
                )
            )
    if search:
        term = f"%{search}%"
        filters.append(
            or_(
                Message.subject.ilike(term),
                Message.from_address.ilike(term),
                Message.from_name.ilike(term),
                Message.body_text.ilike(term),
            )
        )

    # Snooze handling. Default behaviour hides snoozed messages from any folder so
    # they don't clutter the inbox; the dedicated "Snoozed" view passes snoozed=true
    # and we invert the predicate so only currently-snoozed rows come back.
    now = rl_state.clock.now()
    if snoozed:
        filters.append(Message.snooze_until.is_not(None))
        filters.append(Message.snooze_until > now)
    else:
        filters.append(or_(Message.snooze_until.is_(None), Message.snooze_until <= now))

    # Mentions filter — match TipTap @mention spans pinned to the current
    # user's email. The mention extension renders
    #   <span data-type="mention" data-id="{email}">@Name</span>
    # so an ILIKE on the address attribute is the simplest reliable check.
    if mentions_only:
        me = current_user.email.replace('"', '').replace("'", "")
        filters.append(cast(Message.body_html, String).ilike(f'%data-id="{me}"%'))

    # Cursor-based pagination: cursor is the last message id
    if cursor:
        try:
            cursor_id = uuid.UUID(cursor)
            cursor_msg_result = await db.execute(select(Message).where(Message.id == cursor_id))
            cursor_msg = cursor_msg_result.scalar_one_or_none()
            if cursor_msg:
                filters.append(Message.received_at < cursor_msg.received_at)
        except ValueError:
            pass

    # Build sort. Pinned messages always float to the top regardless of secondary sort —
    # mirrors Outlook's "Pin to top" behaviour.
    sort_field, sort_dir = (sort.split(":") + ["desc"])[:2]
    sort_col = getattr(Message, sort_field, Message.received_at)
    order = desc(sort_col) if sort_dir == "desc" else sort_col

    total_result = await db.execute(select(func.count()).select_from(Message).where(*filters))
    total = total_result.scalar() or 0

    result = await db.execute(
        select(Message)
        .options(selectinload(Message.attachments))
        .where(*filters)
        .order_by(desc(Message.is_pinned), order)
        .distinct()
        .limit(limit + 1)
    )
    messages = result.scalars().all()

    has_more = len(messages) > limit
    items = list(messages[:limit])
    next_cursor = str(items[-1].id) if has_more else None

    # Batch-load categories for all returned messages
    msg_ids = [m.id for m in items]
    cats_map: dict[uuid.UUID, list[CategoryOut]] = {}
    if msg_ids:
        cats_result = await db.execute(
            select(MessageCategory.message_id, Category)
            .join(Category, Category.id == MessageCategory.category_id)
            .where(MessageCategory.message_id.in_(msg_ids))
        )
        for row in cats_result.all():
            mid, cat = row
            cats_map.setdefault(mid, []).append(CategoryOut.model_validate(cat))

    msg_outs = []
    for m in items:
        out = MessageOut.model_validate(m)
        out.categories = cats_map.get(m.id, [])
        msg_outs.append(out)

    return MessageList(
        items=msg_outs,
        next_cursor=next_cursor,
        total_count=total,
    )


@router.get("/needs-followup", response_model=MessageList)
async def needs_followup(
    days: int = Query(default=3, ge=1, le=90),
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return sent messages with no reply received after `days` days."""
    cutoff = rl_state.clock.now() - timedelta(days=days)

    # Find the sent folder
    sent_folder = await _get_folder_by_slug(db, "sent", current_user.id)
    if not sent_folder:
        return MessageList(items=[], next_cursor=None, total_count=0)

    # Subquery: message IDs that have at least one reply
    replied_subq = (
        select(Message.in_reply_to_id)
        .where(
            Message.user_id == current_user.id,
            Message.in_reply_to_id.is_not(None),
        )
        .scalar_subquery()
    )

    filters = [
        Message.user_id == current_user.id,
        Message.folder_id == sent_folder.id,
        Message.sent_at.is_not(None),
        Message.sent_at <= cutoff,
        Message.id.not_in(replied_subq),
    ]

    total_result = await db.execute(select(func.count()).select_from(Message).where(*filters))
    total = total_result.scalar() or 0

    result = await db.execute(
        select(Message).where(*filters).order_by(desc(Message.sent_at)).limit(limit)
    )
    items = list(result.scalars().all())

    msg_ids = [m.id for m in items]
    cats_map: dict[uuid.UUID, list[CategoryOut]] = {}
    if msg_ids:
        cats_result = await db.execute(
            select(MessageCategory.message_id, Category)
            .join(Category, Category.id == MessageCategory.category_id)
            .where(MessageCategory.message_id.in_(msg_ids))
        )
        for row in cats_result.all():
            mid, cat = row
            cats_map.setdefault(mid, []).append(CategoryOut.model_validate(cat))

    msg_outs = []
    for m in items:
        out = MessageOut.model_validate(m)
        out.categories = cats_map.get(m.id, [])
        msg_outs.append(out)

    return MessageList(items=msg_outs, next_cursor=None, total_count=total)


@router.get("/search", response_model=MessageList)
async def search_messages(
    q: Optional[str] = None,
    from_addr: Optional[str] = Query(None, alias="from"),
    to_addr: Optional[str] = Query(None, alias="to"),
    cc: Optional[str] = None,
    subject: Optional[str] = None,
    keywords: Optional[str] = None,
    has_attachment: Optional[bool] = None,
    is_read: Optional[bool] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    folder_id: Optional[uuid.UUID] = None,
    cursor: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = [Message.user_id == current_user.id]
    if q:
        term = f"%{q}%"
        filters.append(
            or_(
                Message.subject.ilike(term),
                Message.body_text.ilike(term),
                Message.from_address.ilike(term),
            )
        )
    if from_addr:
        filters.append(Message.from_address.ilike(f"%{from_addr}%"))
    if to_addr:
        filters.append(cast(Message.to_addresses, String).ilike(f"%{to_addr}%"))
    if cc:
        filters.append(cast(Message.cc_addresses, String).ilike(f"%{cc}%"))
    if subject:
        filters.append(Message.subject.ilike(f"%{subject}%"))
    if keywords:
        term = f"%{keywords}%"
        filters.append(
            or_(
                Message.subject.ilike(term),
                Message.body_text.ilike(term),
            )
        )
    if has_attachment is not None:
        filters.append(Message.has_attachments == has_attachment)
    if is_read is not None:
        filters.append(Message.is_read == is_read)
    if date_from:
        filters.append(Message.received_at >= date_from)
    if date_to:
        filters.append(Message.received_at <= date_to)
    if folder_id:
        filters.append(Message.folder_id == folder_id)
    else:
        # Default scope mirrors Outlook search: exclude the trash so a soft-
        # deleted message disappears from the result list. Callers that want
        # the trash explicitly can pass folder_id=<deleted folder>.
        deleted_folder = await _get_folder_by_slug(db, "deleted", current_user.id)
        if deleted_folder:
            filters.append(Message.folder_id != deleted_folder.id)

    total_result = await db.execute(select(func.count()).select_from(Message).where(*filters))
    total = total_result.scalar() or 0

    # Eager-load attachments so the Files tab in the global search dropdown
    # has something to render — Message.attachments is `lazy="noload"` to
    # keep the inbox listing cheap, but search results need the rows so the
    # client can group "files matching <query>" out of the same response.
    result = await db.execute(
        select(Message)
        .where(*filters)
        .order_by(desc(Message.received_at))
        .options(selectinload(Message.attachments))
        .distinct()
        .limit(limit)
    )
    items = list(result.scalars().all())

    return MessageList(
        items=[MessageOut.model_validate(m) for m in items],
        next_cursor=None,
        total_count=total,
    )


async def _load_message_categories(db: AsyncSession, message_id: uuid.UUID) -> list[CategoryOut]:
    result = await db.execute(
        select(Category)
        .join(MessageCategory, Category.id == MessageCategory.category_id)
        .where(MessageCategory.message_id == message_id)
    )
    return [CategoryOut.model_validate(c) for c in result.scalars().all()]


@router.get("/{message_id}", response_model=MessageOut)
async def get_message(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = await _get_message_or_404(db, message_id, current_user.id)
    out = MessageOut.model_validate(msg)
    out.categories = await _load_message_categories(db, msg.id)
    # Load attachments
    att_result = await db.execute(select(Attachment).where(Attachment.message_id == msg.id))
    out.attachments = [AttachmentOut.model_validate(a) for a in att_result.scalars().all()]
    return out


@router.post("", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def create_message(
    body: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = rl_state.clock.now()

    # Server-side DLP enforcement — runs only on real sends (drafts are
    # exempt so the user can save in-progress work without tripping rules).
    # Frontend already runs the same engine for the live policy tip + a
    # warn dialog, but a malicious client can bypass that, so we re-check
    # here before persisting + delivering.
    if not body.is_draft:
        from app.api.routes.dlp import (
            evaluate_dlp,
            DlpEvaluateRequest,
            AddressIn,
            AttachmentIn,
        )
        dlp_req = DlpEvaluateRequest(
            to=[AddressIn(email=a.get("email", ""), name=a.get("name"))
                for a in (body.to_addresses or []) if isinstance(a, dict)],
            cc=[AddressIn(email=a.get("email", ""), name=a.get("name"))
                for a in (body.cc_addresses or []) if isinstance(a, dict)],
            bcc=[AddressIn(email=a.get("email", ""), name=a.get("name"))
                for a in (body.bcc_addresses or []) if isinstance(a, dict)],
            subject=body.subject or "",
            body=body.body_html or body.body_text or "",
            attachments=[AttachmentIn(name="")],  # filenames hydrated post-create
            # Encrypt-mode picks (e.g. "Encrypt-Only", "Do Not Forward")
            # override the sensitivity label so the engine's
            # ENCRYPT_LABEL_SET rule fires server-side too — keeps the
            # frontend live banner and the send-time gate in agreement.
            sensitivity_label=(
                "encrypt"
                if (body.encrypt_mode and body.encrypt_mode != "none")
                else (body.sensitivity or "public")
            ),
        )
        dlp_result = evaluate_dlp(dlp_req, current_user.email)
        if dlp_result.status == "block":
            messages_summary = "; ".join(t.message for t in dlp_result.policy_tips)
            _err(
                "dlp_blocked",
                f"Message blocked by DLP policy: {messages_summary}",
                403,
            )

    # Resolve folder. Schedule-send rides the drafts path even when the user
    # hit "Send" — the message sits in Drafts (not Sent) until dispatch so the
    # user can find/cancel it and so list filters that exclude drafts don't
    # leak the unsent copy into Sent.
    is_scheduled_send = bool(
        body.scheduled_send_at and body.scheduled_send_at > now and not body.is_draft
    )
    if body.folder_id:
        folder_id = body.folder_id
    elif is_scheduled_send:
        # Park in the Scheduled folder so the user can find / edit / cancel
        # before dispatch. Falls back to Drafts if Scheduled doesn't exist
        # (legacy users seeded before the folder was added).
        folder = await _get_folder_by_slug(db, "scheduled", current_user.id)
        if not folder:
            folder = await _get_folder_by_slug(db, "drafts", current_user.id)
        folder_id = folder.id if folder else None
    elif body.is_draft:
        folder = await _get_folder_by_slug(db, "drafts", current_user.id)
        folder_id = folder.id if folder else None
    else:
        folder = await _get_folder_by_slug(db, "sent", current_user.id)
        folder_id = folder.id if folder else None

    if not folder_id:
        _err("folder_required", "Could not resolve folder", 400)

    # @ mention handling: parse mention spans out of body_html and auto-Cc anyone
    # who isn't already a recipient. Mirrors Outlook — typing @alice in the body
    # adds her to the To/Cc bar so she gets the message in her inbox. The TipTap
    # Mention extension renders <span data-type="mention" data-id="email">@Name</span>.
    augmented_cc = list(body.cc_addresses or [])
    if body.body_html and not body.is_draft:
        existing_emails = {
            (a.get("email") or "").lower()
            for a in (body.to_addresses or []) + augmented_cc + (body.bcc_addresses or [])
            if isinstance(a, dict)
        }
        existing_emails.add(current_user.email.lower())
        # Match either order of attributes — TipTap doesn't guarantee a fixed sequence.
        mention_re = re.compile(
            r'<span\b[^>]*\bdata-type=["\']mention["\'][^>]*\bdata-id=["\']([^"\']+)["\']'
            r'|<span\b[^>]*\bdata-id=["\']([^"\']+)["\'][^>]*\bdata-type=["\']mention["\']',
            re.IGNORECASE,
        )
        for match in mention_re.finditer(body.body_html):
            email = (match.group(1) or match.group(2) or "").strip().lower()
            if not email or "@" not in email or email in existing_emails:
                continue
            existing_emails.add(email)
            mentioned_user = await db.execute(select(User).where(User.email == email))
            mu = mentioned_user.scalar_one_or_none()
            augmented_cc.append({"email": email, "name": (mu.display_name if mu else email)})

    # Ensure every sent message lives inside a conversation so the recipient's
    # eventual reply lands on the same thread as the sender's original copy.
    # (Drafts skip — they have no recipients yet.)
    conv_id = body.conversation_id
    # Ribbon Reply/Reply All/Forward sends in_reply_to_id but no conversation_id
    # (the compose draft only carries replyToMessageId). Inherit the parent's
    # conversation so the reply threads with the original instead of starting
    # a brand-new conversation.
    if not conv_id and body.in_reply_to_id:
        parent = await db.execute(
            select(Message).where(
                Message.id == body.in_reply_to_id,
                Message.user_id == current_user.id,
            )
        )
        parent_msg = parent.scalar_one_or_none()
        if parent_msg and parent_msg.conversation_id:
            conv_id = parent_msg.conversation_id
    if not conv_id and not body.is_draft:
        from app.models.conversation import Conversation
        conv = Conversation(
            id=uuid.uuid4(),
            user_id=current_user.id,
            subject=body.subject or "",
            last_message_at=now,
            message_count=1,
            has_attachments=False,
        )
        db.add(conv)
        await db.flush()
        conv_id = conv.id

    # Schedule-send: future scheduled_send_at means the message is parked as a
    # draft (in Drafts) until _flush_due_scheduled dispatches it.
    is_scheduled = is_scheduled_send
    effective_is_draft = body.is_draft or is_scheduled

    msg = Message(
        id=uuid.uuid4(),
        user_id=current_user.id,
        folder_id=folder_id,
        conversation_id=conv_id,
        in_reply_to_id=body.in_reply_to_id,
        reply_type=body.reply_type,
        from_address=current_user.email,
        from_name=current_user.display_name,
        to_addresses=body.to_addresses,
        cc_addresses=augmented_cc,
        bcc_addresses=body.bcc_addresses,
        subject=body.subject,
        body_html=body.body_html,
        body_text=body.body_text,
        importance=body.importance,
        sensitivity=body.sensitivity,
        encrypt_mode=(body.encrypt_mode or "none"),
        boomerang_at=body.boomerang_at,
        is_draft=effective_is_draft,
        is_flagged=body.is_flagged,
        scheduled_send_at=body.scheduled_send_at,
        sent_at=None if effective_is_draft else now,
        received_at=None if effective_is_draft else now,
        created_at=now,
        updated_at=now,
    )
    db.add(msg)
    await db.flush()
    await _update_folder_counts(db, folder_id)

    rl_state.event_log.append("message_created", {
        "id": str(msg.id),
        "is_draft": msg.is_draft,
        "scheduled": is_scheduled,
    })

    # If the message is scheduled (future), bail out before OOF + delivery —
    # the flush helper dispatches it later.
    if is_scheduled:
        return MessageOut.model_validate(msg)

    # OOF auto-reply: when sending (not draft), check if any recipient has OOF enabled.
    # Uses augmented_cc so anyone added via an @ mention also triggers OOF when relevant.
    if not body.is_draft:
        all_recipients = list(body.to_addresses or []) + list(augmented_cc)
        for recipient in all_recipients:
            rec_email = recipient.get("email", "") if isinstance(recipient, dict) else ""
            if not rec_email:
                continue
            oof_result = await db.execute(
                select(User).where(
                    User.email == rec_email,
                    User.out_of_office_enabled.is_(True),
                )
            )
            oof_user = oof_result.scalar_one_or_none()
            if not oof_user:
                continue
            if oof_user.out_of_office_start and now < oof_user.out_of_office_start:
                continue
            if oof_user.out_of_office_end and now > oof_user.out_of_office_end:
                continue
            # Pick internal vs external message based on whether the sender
            # shares a domain with the OOF user — Outlook's split between
            # "Inside my organization" and "Outside my organization" replies.
            sender_domain = (current_user.email.split("@")[-1] or "").lower()
            recv_domain = (oof_user.email.split("@")[-1] or "").lower()
            same_org = sender_domain and sender_domain == recv_domain
            oof_body = (
                (oof_user.out_of_office_message_internal if same_org
                 else oof_user.out_of_office_message_external)
                or oof_user.out_of_office_message_internal
                or oof_user.out_of_office_message_external
                or "I am currently out of office."
            )
            inbox_folder = await _get_folder_by_slug(db, "inbox", current_user.id)
            if not inbox_folder:
                continue
            oof_msg = Message(
                id=uuid.uuid4(),
                user_id=current_user.id,
                folder_id=inbox_folder.id,
                from_address=oof_user.email,
                from_name=oof_user.display_name,
                to_addresses=[{"email": current_user.email, "name": current_user.display_name}],
                cc_addresses=[],
                bcc_addresses=[],
                subject=f"Automatic reply: {body.subject or '(no subject)'}",
                body_html=f"<p>{oof_body}</p>",
                is_read=False,
                is_draft=False,
                sent_at=now,
                received_at=now,
                created_at=now,
                updated_at=now,
            )
            db.add(oof_msg)
            await db.flush()
            await _update_folder_counts(db, inbox_folder.id)
            rl_state.event_log.append("oof_auto_reply", {"from": rec_email, "to": current_user.email})

    # Deliver message to each recipient's inbox. Use augmented_cc so anyone the
    # sender @-mentioned in the body actually receives the email.
    if not body.is_draft:
        await _deliver_to_recipients(db, msg, body.to_addresses, augmented_cc, body.bcc_addresses, current_user)

    return MessageOut.model_validate(msg)


@router.patch("/{message_id}", response_model=MessageOut)
async def update_message(
    message_id: uuid.UUID,
    body: MessageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = await _get_message_or_404(db, message_id, current_user.id)
    now = rl_state.clock.now()

    old_folder_id = msg.folder_id
    old_is_read = msg.is_read

    if body.folder_id is not None:
        msg.folder_id = body.folder_id
    if body.is_read is not None:
        msg.is_read = body.is_read
    if body.is_flagged is not None:
        msg.is_flagged = body.is_flagged
    if body.is_pinned is not None:
        msg.is_pinned = body.is_pinned
    if body.importance is not None:
        msg.importance = body.importance
    if body.sensitivity is not None:
        msg.sensitivity = body.sensitivity
    if body.subject is not None:
        msg.subject = body.subject
    if body.body_html is not None:
        msg.body_html = body.body_html
    if body.body_text is not None:
        msg.body_text = body.body_text
    # Use model_fields_set so an explicit `snooze_until: null` from the client
    # clears the column (Outlook's "Unsnooze" path) without affecting other PATCHes
    # that simply omit the field.
    if "snooze_until" in body.model_fields_set:
        msg.snooze_until = body.snooze_until
    if body.scheduled_send_at is not None:
        msg.scheduled_send_at = body.scheduled_send_at
    # Boomerang follow-up: same nullable-PATCH pattern as snooze. Sending
    # `boomerang_at: null` clears the reminder; resetting also wipes
    # boomerang_fired_at so the user can extend a reminder that already fired.
    if "boomerang_at" in body.model_fields_set:
        msg.boomerang_at = body.boomerang_at
        msg.boomerang_fired_at = None

    msg.updated_at = now

    # Handle categories
    if body.category_ids is not None:
        await db.execute(
            MessageCategory.__table__.delete().where(MessageCategory.message_id == msg.id)
        )
        for cat_id in body.category_ids:
            db.add(MessageCategory(message_id=msg.id, category_id=cat_id))

    await db.flush()

    # Update folder counts if folder changed
    if body.folder_id and body.folder_id != old_folder_id:
        await _update_folder_counts(db, old_folder_id)
        await _update_folder_counts(db, body.folder_id)
    elif body.is_read is not None and body.is_read != old_is_read:
        await _update_folder_counts(db, msg.folder_id)

    rl_state.event_log.append("message_updated", {"id": str(msg.id)})
    out = MessageOut.model_validate(msg)
    out.categories = await _load_message_categories(db, msg.id)
    return out


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete — move to Deleted Items."""
    msg = await _get_message_or_404(db, message_id, current_user.id)
    deleted_folder = await _get_folder_by_slug(db, "deleted", current_user.id)
    if deleted_folder:
        old_folder_id = msg.folder_id
        msg.folder_id = deleted_folder.id
        msg.updated_at = rl_state.clock.now()
        await db.flush()
        await _update_folder_counts(db, old_folder_id)
        await _update_folder_counts(db, deleted_folder.id)
    rl_state.event_log.append("message_deleted", {"id": str(msg.id)})


@router.delete("/{message_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def permanently_delete_message(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = await _get_message_or_404(db, message_id, current_user.id)
    folder_id = msg.folder_id
    await db.delete(msg)
    await db.flush()
    await _update_folder_counts(db, folder_id)
    rl_state.event_log.append("message_permanently_deleted", {"id": str(message_id)})


@router.post("/{message_id}/reply", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def reply_message(
    message_id: uuid.UUID,
    body: ReplyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    original = await _get_message_or_404(db, message_id, current_user.id)
    now = rl_state.clock.now()

    sent_folder = await _get_folder_by_slug(db, "sent", current_user.id)
    folder_id = sent_folder.id if sent_folder else original.folder_id

    to_addresses = [{"email": original.from_address, "name": original.from_name}]
    cc_addresses = []
    if body.reply_all:
        cc_addresses = [a for a in (original.to_addresses or []) if a.get("email") != current_user.email]
        cc_addresses += original.cc_addresses or []

    # Auto-create or update conversation for threading
    from app.models.conversation import Conversation
    conv_id = original.conversation_id
    if not conv_id:
        conv = Conversation(
            id=uuid.uuid4(),
            user_id=current_user.id,
            subject=original.subject,
            last_message_at=now,
            message_count=2,
            has_attachments=original.has_attachments,
        )
        db.add(conv)
        await db.flush()
        conv_id = conv.id
        original.conversation_id = conv_id
    else:
        # Update existing conversation
        conv_result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
        conv = conv_result.scalar_one_or_none()
        if conv:
            conv.message_count = (conv.message_count or 0) + 1
            conv.last_message_at = now

    reply = Message(
        id=uuid.uuid4(),
        user_id=current_user.id,
        folder_id=folder_id,
        conversation_id=conv_id,
        in_reply_to_id=original.id,
        reply_type="reply_all" if body.reply_all else "reply",
        from_address=current_user.email,
        from_name=current_user.display_name,
        to_addresses=to_addresses,
        cc_addresses=cc_addresses,
        bcc_addresses=[],
        subject=f"Re: {original.subject}" if not original.subject.startswith("Re:") else original.subject,
        body_html=body.body_html,
        is_draft=False,
        sent_at=now,
        received_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(reply)
    await db.flush()
    await _update_folder_counts(db, folder_id)

    rl_state.event_log.append("message_replied", {"id": str(reply.id), "original_id": str(original.id)})

    # Deliver reply to recipients
    await _deliver_to_recipients(db, reply, to_addresses, cc_addresses, [], current_user)

    return MessageOut.model_validate(reply)


@router.post("/{message_id}/forward", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def forward_message(
    message_id: uuid.UUID,
    body: ForwardRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    original = await _get_message_or_404(db, message_id, current_user.id)
    now = rl_state.clock.now()

    sent_folder = await _get_folder_by_slug(db, "sent", current_user.id)
    folder_id = sent_folder.id if sent_folder else original.folder_id

    fwd = Message(
        id=uuid.uuid4(),
        user_id=current_user.id,
        folder_id=folder_id,
        conversation_id=original.conversation_id,
        in_reply_to_id=original.id,
        reply_type="forward",
        from_address=current_user.email,
        from_name=current_user.display_name,
        to_addresses=body.to_addresses,
        cc_addresses=body.cc_addresses,
        bcc_addresses=[],
        subject=f"Fwd: {original.subject}" if not original.subject.startswith("Fwd:") else original.subject,
        body_html=body.body_html or original.body_html,
        has_attachments=original.has_attachments,
        is_draft=False,
        sent_at=now,
        received_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(fwd)
    await db.flush()
    await _update_folder_counts(db, folder_id)

    rl_state.event_log.append("message_forwarded", {"id": str(fwd.id), "original_id": str(original.id)})

    # Deliver forward to recipients
    await _deliver_to_recipients(db, fwd, body.to_addresses, body.cc_addresses, [], current_user)

    return MessageOut.model_validate(fwd)


@router.post("/{message_id}/move", status_code=status.HTTP_204_NO_CONTENT)
async def move_message(
    message_id: uuid.UUID,
    body: MoveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = await _get_message_or_404(db, message_id, current_user.id)
    old_folder_id = msg.folder_id
    msg.folder_id = body.folder_id
    msg.updated_at = rl_state.clock.now()
    await db.flush()
    await _update_folder_counts(db, old_folder_id)
    await _update_folder_counts(db, body.folder_id)
    rl_state.event_log.append("message_moved", {"id": str(msg.id), "to_folder": str(body.folder_id)})


@router.post("/{message_id}/report")
async def report_message(
    message_id: uuid.UUID,
    report_type: str = Query(default="junk", description="junk or phishing"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Report as junk/phishing — moves message to Junk folder."""
    msg = await _get_message_or_404(db, message_id, current_user.id)
    junk_folder = await _get_folder_by_slug(db, "junk", current_user.id)
    if junk_folder:
        old_folder_id = msg.folder_id
        msg.folder_id = junk_folder.id
        msg.is_read = True
        msg.updated_at = rl_state.clock.now()
        await db.flush()
        await _update_folder_counts(db, old_folder_id)
        await _update_folder_counts(db, junk_folder.id)
    rl_state.event_log.append("message_reported", {"id": str(msg.id), "type": report_type})
    return {"status": "reported", "type": report_type}


@router.post("/{message_id}/block")
async def block_sender(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Block sender — moves all messages from this sender to Junk."""
    msg = await _get_message_or_404(db, message_id, current_user.id)
    sender = msg.from_address
    junk_folder = await _get_folder_by_slug(db, "junk", current_user.id)
    if not junk_folder:
        return {"status": "no_junk_folder", "blocked": 0}

    # Move all messages from this sender to Junk
    result = await db.execute(
        select(Message).where(
            Message.user_id == current_user.id,
            Message.from_address == sender,
            Message.folder_id != junk_folder.id,
        )
    )
    msgs = result.scalars().all()
    affected_folders = set()
    for m in msgs:
        affected_folders.add(m.folder_id)
        m.folder_id = junk_folder.id
        m.is_read = True

    await db.flush()
    for fid in affected_folders:
        await _update_folder_counts(db, fid)
    await _update_folder_counts(db, junk_folder.id)

    rl_state.event_log.append("sender_blocked", {"sender": sender, "moved": len(msgs)})
    return {"status": "blocked", "sender": sender, "moved": len(msgs)}


@router.post("/{message_id}/ignore")
async def ignore_conversation(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ignore conversation — moves all messages in this conversation to Deleted."""
    msg = await _get_message_or_404(db, message_id, current_user.id)
    deleted_folder = await _get_folder_by_slug(db, "deleted", current_user.id)
    if not deleted_folder:
        return {"status": "no_deleted_folder", "moved": 0}

    if msg.conversation_id:
        result = await db.execute(
            select(Message).where(
                Message.user_id == current_user.id,
                Message.conversation_id == msg.conversation_id,
                Message.folder_id != deleted_folder.id,
            )
        )
        msgs = result.scalars().all()
    else:
        msgs = [msg] if msg.folder_id != deleted_folder.id else []

    affected_folders = set()
    for m in msgs:
        affected_folders.add(m.folder_id)
        m.folder_id = deleted_folder.id
        m.is_read = True

    await db.flush()
    for fid in affected_folders:
        await _update_folder_counts(db, fid)
    await _update_folder_counts(db, deleted_folder.id)

    rl_state.event_log.append("conversation_ignored", {"message_id": str(msg.id), "moved": len(msgs)})
    return {"status": "ignored", "moved": len(msgs)}


@router.post("/{message_id}/copy")
async def copy_message(
    message_id: uuid.UUID,
    body: MoveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Copy message to another folder (duplicate, not move)."""
    msg = await _get_message_or_404(db, message_id, current_user.id)
    now = rl_state.clock.now()
    copy = Message(
        id=uuid.uuid4(),
        user_id=current_user.id,
        folder_id=body.folder_id,
        conversation_id=msg.conversation_id,
        in_reply_to_id=msg.in_reply_to_id,
        reply_type=msg.reply_type,
        from_address=msg.from_address,
        from_name=msg.from_name,
        to_addresses=msg.to_addresses,
        cc_addresses=msg.cc_addresses,
        bcc_addresses=msg.bcc_addresses,
        subject=msg.subject,
        body_html=msg.body_html,
        body_text=msg.body_text,
        importance=msg.importance,
        sensitivity=msg.sensitivity,
        encrypt_mode=msg.encrypt_mode,
        has_attachments=msg.has_attachments,
        is_read=msg.is_read,
        is_flagged=msg.is_flagged,
        is_pinned=msg.is_pinned,
        is_draft=False,
        sent_at=msg.sent_at,
        received_at=msg.received_at,
        created_at=now,
        updated_at=now,
    )
    db.add(copy)
    await db.flush()
    await _update_folder_counts(db, body.folder_id)
    rl_state.event_log.append("message_copied", {"id": str(copy.id), "from": str(msg.id), "to_folder": str(body.folder_id)})
    return {"status": "copied", "id": str(copy.id)}


@router.post("/bulk")
async def bulk_action(
    body: BulkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = rl_state.clock.now()
    affected = 0

    for msg_id in body.message_ids:
        result = await db.execute(
            select(Message).where(Message.id == msg_id, Message.user_id == current_user.id)
        )
        msg = result.scalar_one_or_none()
        if not msg:
            continue

        old_folder_id = msg.folder_id

        if body.action == "mark_read":
            msg.is_read = True
        elif body.action == "mark_unread":
            msg.is_read = False
        elif body.action == "flag":
            msg.is_flagged = True
        elif body.action == "unflag":
            msg.is_flagged = False
        elif body.action == "delete":
            deleted_folder = await _get_folder_by_slug(db, "deleted", current_user.id)
            if deleted_folder:
                msg.folder_id = deleted_folder.id
        elif body.action == "move":
            folder_id = (body.params or {}).get("folder_id")
            if folder_id:
                msg.folder_id = uuid.UUID(str(folder_id))
        elif body.action == "categorize":
            cat_ids = (body.params or {}).get("category_ids", [])
            await db.execute(
                MessageCategory.__table__.delete().where(MessageCategory.message_id == msg.id)
            )
            for cat_id in cat_ids:
                db.add(MessageCategory(message_id=msg.id, category_id=uuid.UUID(str(cat_id))))

        msg.updated_at = now
        await db.flush()

        if msg.folder_id != old_folder_id:
            await _update_folder_counts(db, old_folder_id)
            await _update_folder_counts(db, msg.folder_id)

        affected += 1

    rl_state.event_log.append("bulk_action", {"action": body.action, "affected": affected})
    return {"affected": affected}


# ---------------------------------------------------------------------------
# Attachments sub-resource
# ---------------------------------------------------------------------------


@router.get("/{message_id}/attachments", response_model=list[AttachmentOut])
async def list_attachments(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_message_or_404(db, message_id, current_user.id)
    result = await db.execute(select(Attachment).where(Attachment.message_id == message_id))
    return [AttachmentOut.model_validate(a) for a in result.scalars().all()]


@router.get("/{message_id}/attachments/{attachment_id}/download")
async def download_attachment(
    message_id: uuid.UUID,
    attachment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_message_or_404(db, message_id, current_user.id)
    result = await db.execute(
        select(Attachment).where(
            Attachment.id == attachment_id,
            Attachment.message_id == message_id,
        )
    )
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Attachment not found"}})
    content = _attachment_store.get(str(att.id), b"")
    return Response(
        content=content,
        media_type=att.content_type,
        headers={"Content-Disposition": f'attachment; filename="{att.filename}"'},
    )


@router.post("/{message_id}/attachments", response_model=AttachmentOut, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    message_id: uuid.UUID,
    file: UploadFile = FastAPIFile(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = await _get_message_or_404(db, message_id, current_user.id)
    content = await file.read()
    now = rl_state.clock.now()
    attachment = Attachment(
        id=uuid.uuid4(),
        message_id=message_id,
        filename=file.filename or "unnamed",
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        storage_path=None,
        is_inline=False,
        created_at=now,
    )
    db.add(attachment)
    msg.has_attachments = True
    msg.updated_at = now
    await db.flush()
    # Store content in memory for download
    _attachment_store[str(attachment.id)] = content
    rl_state.event_log.append("attachment_uploaded", {"message_id": str(message_id), "filename": attachment.filename})
    return AttachmentOut.model_validate(attachment)


# ---------------------------------------------------------------------------
# Sweep endpoints
# ---------------------------------------------------------------------------


@router.post("/sweep/keep-latest")
async def sweep_keep_latest(
    body: SweepKeepLatestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Keep only the most recent message from a sender; move the rest to Deleted Items."""
    q = select(Message).where(
        Message.user_id == current_user.id,
        Message.from_address.ilike(body.sender_email),
    )
    if body.folder_id:
        q = q.where(Message.folder_id == body.folder_id)
    q = q.order_by(desc(Message.received_at))

    result = await db.execute(q)
    msgs = result.scalars().all()

    if not msgs:
        return {"deleted": 0, "kept": 0}

    deleted_result = await db.execute(
        select(Folder).where(Folder.user_id == current_user.id, Folder.slug == "deleted")
    )
    deleted_folder = deleted_result.scalar_one_or_none()

    kept = msgs[0]  # most recent — keep as-is
    deleted_count = 0
    affected_folder_ids: set[uuid.UUID] = set()
    for msg in msgs[1:]:
        affected_folder_ids.add(msg.folder_id)
        if deleted_folder:
            msg.folder_id = deleted_folder.id
        else:
            await db.delete(msg)
        deleted_count += 1

    await db.flush()
    # Refresh folder counts on every source folder + the deleted folder so
    # the sidebar totals don't go stale.
    if deleted_folder:
        affected_folder_ids.add(deleted_folder.id)
    for fid in affected_folder_ids:
        await _update_folder_counts(db, fid)
    rl_state.event_log.append("sweep_keep_latest", {
        "sender": body.sender_email,
        "kept": str(kept.id),
        "deleted": deleted_count,
    })
    return {"deleted": deleted_count, "kept": 1}


@router.post("/sweep/move-all")
async def sweep_move_all(
    body: SweepMoveAllRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move all messages from a sender to a target folder."""
    # Validate target folder belongs to user
    tf_result = await db.execute(
        select(Folder).where(Folder.id == body.target_folder_id, Folder.user_id == current_user.id)
    )
    if not tf_result.scalar_one_or_none():
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Target folder not found"}},
        )

    q = select(Message).where(
        Message.user_id == current_user.id,
        Message.from_address.ilike(body.sender_email),
    )
    if body.source_folder_id:
        q = q.where(Message.folder_id == body.source_folder_id)

    result = await db.execute(q)
    msgs = result.scalars().all()

    affected_source_ids: set[uuid.UUID] = set()
    for msg in msgs:
        if msg.folder_id != body.target_folder_id:
            affected_source_ids.add(msg.folder_id)
        msg.folder_id = body.target_folder_id

    await db.flush()
    for fid in affected_source_ids:
        await _update_folder_counts(db, fid)
    await _update_folder_counts(db, body.target_folder_id)
    rl_state.event_log.append("sweep_move_all", {
        "sender": body.sender_email,
        "target_folder_id": str(body.target_folder_id),
        "moved": len(msgs),
    })
    return {"moved": len(msgs)}


@router.post("/cleanup-thread")
async def cleanup_thread(
    body: CleanUpThreadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Clean Up Conversation: delete messages whose full body text is already
    quoted (contained) in a later message in the same thread.
    Redundant messages are moved to Deleted Items.
    """
    result = await db.execute(
        select(Message)
        .where(
            Message.conversation_id == body.conversation_id,
            Message.user_id == current_user.id,
        )
        .order_by(Message.received_at)
    )
    msgs = result.scalars().all()

    if len(msgs) <= 1:
        return {"cleaned": 0}

    deleted_folder_result = await db.execute(
        select(Folder).where(Folder.user_id == current_user.id, Folder.slug == "deleted")
    )
    deleted_folder = deleted_folder_result.scalar_one_or_none()

    cleaned = 0
    # For each message (oldest first), check if its plain-text body is fully
    # contained within any later message's body — if so it is redundant.
    for i, msg in enumerate(msgs[:-1]):  # never delete the newest
        body_text = (msg.body_text or "").strip()
        if not body_text:
            continue
        later_bodies = " ".join((m.body_text or "") for m in msgs[i + 1:])
        if body_text in later_bodies:
            if deleted_folder:
                msg.folder_id = deleted_folder.id
            else:
                await db.delete(msg)
            cleaned += 1

    await db.flush()
    rl_state.event_log.append("cleanup_thread", {
        "conversation_id": str(body.conversation_id),
        "cleaned": cleaned,
    })
    return {"cleaned": cleaned}
