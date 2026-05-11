import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.schemas.message import MessageOut

router = APIRouter(prefix="/conversations", tags=["Conversations"])


class ConversationOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    subject: str
    last_message_at: Optional[str] = None
    message_count: int
    has_attachments: bool


class ConversationList(BaseModel):
    items: list[ConversationOut]
    next_cursor: Optional[str] = None
    total_count: int


class ConversationDetail(BaseModel):
    conversation: ConversationOut
    messages: list[MessageOut]


@router.get("", response_model=ConversationList)
async def list_conversations(
    folder_id: Optional[uuid.UUID] = None,
    cursor: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Aggregate every conversation the user participates in — owned by them or
    # not — by scanning their own messages. The per-user message_count is the
    # number of rows the user can see in that thread, so threading badges in
    # the list (e.g. "(3)") stay accurate for recipients too.
    agg_q = await db.execute(
        select(
            Message.conversation_id,
            func.count(Message.id).label("msg_count"),
            func.max(Message.received_at).label("last_at"),
            func.bool_or(Message.has_attachments).label("any_att"),
        )
        .where(
            Message.user_id == current_user.id,
            Message.conversation_id.is_not(None),
        )
        .group_by(Message.conversation_id)
        .order_by(desc(func.max(Message.received_at)))
        .limit(limit + 1)
    )
    rows = list(agg_q.all())

    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = str(rows[-1][0]) if has_more else None

    conv_ids = [r[0] for r in rows]
    conv_map: dict[uuid.UUID, Conversation] = {}
    subj_map: dict[uuid.UUID, str] = {}
    if conv_ids:
        conv_q = await db.execute(
            select(Conversation).where(Conversation.id.in_(conv_ids))
        )
        conv_map = {c.id: c for c in conv_q.scalars().all()}
        # Fall back to a representative message's subject when the user can't
        # see the owner Conversation row (still happens for recipients).
        subj_q = await db.execute(
            select(Message.conversation_id, func.max(Message.subject))
            .where(
                Message.user_id == current_user.id,
                Message.conversation_id.in_(conv_ids),
            )
            .group_by(Message.conversation_id)
        )
        subj_map = {cid: s for cid, s in subj_q.all()}

    items: list[ConversationOut] = []
    for conv_id, msg_count, last_at, any_att in rows:
        conv = conv_map.get(conv_id)
        items.append(
            ConversationOut(
                id=conv_id,
                user_id=conv.user_id if conv else current_user.id,
                subject=(conv.subject if conv else subj_map.get(conv_id, "")) or "",
                last_message_at=last_at.isoformat() if last_at else None,
                message_count=msg_count,
                has_attachments=bool(any_att),
            )
        )

    return ConversationList(
        items=items,
        next_cursor=next_cursor,
        total_count=len(items) + (1 if has_more else 0),
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Conversation rows are owned by the original sender, but a conversation_id
    # is shared across every participant's mailbox (the recipient's delivered
    # copy carries the same conversation_id). Authorisation is therefore based
    # on whether the *requester* has any message in this thread — not on who
    # created the Conversation row — otherwise the recipient gets a 404 when
    # expanding a thread the sender started.
    msgs_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id, Message.user_id == current_user.id)
        .order_by(Message.received_at)
    )
    messages = msgs_result.scalars().all()
    if not messages:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Conversation not found"}},
        )

    # Prefer the original Conversation row for subject/metadata, but synthesize
    # a stand-in from the user's own messages if the owner row isn't visible.
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = result.scalar_one_or_none()

    if conv:
        conv_out = ConversationOut(
            id=conv.id,
            user_id=conv.user_id,
            subject=conv.subject,
            last_message_at=conv.last_message_at.isoformat() if conv.last_message_at else None,
            message_count=conv.message_count,
            has_attachments=conv.has_attachments,
        )
    else:
        latest = max(messages, key=lambda m: m.received_at or m.created_at)
        conv_out = ConversationOut(
            id=conversation_id,
            user_id=current_user.id,
            subject=latest.subject or "",
            last_message_at=(latest.received_at or latest.created_at).isoformat(),
            message_count=len(messages),
            has_attachments=any(m.has_attachments for m in messages),
        )

    return ConversationDetail(
        conversation=conv_out,
        messages=[MessageOut.model_validate(m) for m in messages],
    )
