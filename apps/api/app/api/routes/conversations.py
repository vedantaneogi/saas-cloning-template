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
    filters = [Conversation.user_id == current_user.id]

    total_result = await db.execute(
        select(func.count()).select_from(Conversation).where(*filters)
    )
    total = total_result.scalar() or 0

    result = await db.execute(
        select(Conversation)
        .where(*filters)
        .order_by(desc(Conversation.last_message_at))
        .limit(limit + 1)
    )
    convs = list(result.scalars().all())

    has_more = len(convs) > limit
    items = convs[:limit]
    next_cursor = str(items[-1].id) if has_more else None

    def _out(c: Conversation) -> dict:
        return {
            "id": c.id,
            "user_id": c.user_id,
            "subject": c.subject,
            "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
            "message_count": c.message_count,
            "has_attachments": c.has_attachments,
        }

    return ConversationList(
        items=[ConversationOut(**_out(c)) for c in items],
        next_cursor=next_cursor,
        total_count=total,
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Conversation not found"}},
        )

    msgs_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.received_at)
    )
    messages = msgs_result.scalars().all()

    conv_out = ConversationOut(
        id=conv.id,
        user_id=conv.user_id,
        subject=conv.subject,
        last_message_at=conv.last_message_at.isoformat() if conv.last_message_at else None,
        message_count=conv.message_count,
        has_attachments=conv.has_attachments,
    )

    return ConversationDetail(
        conversation=conv_out,
        messages=[MessageOut.model_validate(m) for m in messages],
    )
