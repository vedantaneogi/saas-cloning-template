import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.envelopes.models import (
    AuditEvent,
    Comment,
    Document,
    Envelope,
    EnvelopeStatus,
    Field,
    Recipient,
    RecipientStatus,
)
from app.envelopes.schemas import (
    CommentCreate,
    EnvelopeCreate,
    EnvelopeUpdate,
    FieldCreate,
    FieldUpdate,
    RecipientCreate,
    RecipientUpdate,
    VoidEnvelopeRequest,
)
from app.envelopes.state_machine import validate_transition


# ── Envelope CRUD ─────────────────────────────────────────────────────────────

async def create_envelope(
    db: AsyncSession, user_id: int, data: EnvelopeCreate
) -> Envelope:
    envelope = Envelope(
        user_id=user_id,
        subject=data.subject,
        message=data.message,
        expires_at=data.expires_at,
        reminder_days=data.reminder_days,
        status=EnvelopeStatus.draft,
    )
    db.add(envelope)
    await db.commit()
    await db.refresh(envelope)
    return envelope


async def list_envelopes(
    db: AsyncSession,
    user_id: int,
    status: Optional[EnvelopeStatus] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Envelope], int]:
    query = select(Envelope).where(Envelope.user_id == user_id)
    if status:
        query = query.where(Envelope.status == status)
    if search:
        query = query.where(Envelope.subject.ilike(f"%{search}%"))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    query = query.order_by(Envelope.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all(), total


async def get_envelope(
    db: AsyncSession, envelope_id: uuid.UUID, user_id: int
) -> Envelope | None:
    result = await db.execute(
        select(Envelope)
        .options(
            selectinload(Envelope.documents).selectinload(Document.fields),
            selectinload(Envelope.recipients).selectinload(Recipient.fields),
        )
        .where(Envelope.id == envelope_id, Envelope.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def update_envelope(
    db: AsyncSession, envelope: Envelope, data: EnvelopeUpdate
) -> Envelope:
    if data.subject is not None:
        envelope.subject = data.subject
    if data.message is not None:
        envelope.message = data.message
    if data.expires_at is not None:
        envelope.expires_at = data.expires_at
    if data.reminder_days is not None:
        envelope.reminder_days = data.reminder_days
    await db.commit()
    await db.refresh(envelope)
    return envelope


async def delete_envelope(db: AsyncSession, envelope: Envelope) -> None:
    await db.delete(envelope)
    await db.commit()


async def send_envelope(db: AsyncSession, envelope: Envelope) -> Envelope:
    if not envelope.recipients:
        raise ValueError("Envelope must have at least one recipient")
    validate_transition(envelope.status, EnvelopeStatus.sent)
    envelope.status = EnvelopeStatus.sent
    envelope.sent_at = datetime.now(timezone.utc)
    # Assign signing tokens; for serial routing only activate recipients with the minimum routing_order
    min_order = min(r.routing_order for r in envelope.recipients)
    for recipient in envelope.recipients:
        recipient.signing_token = str(uuid.uuid4())
        if recipient.status == RecipientStatus.pending:
            # Only mark as "sent" the first routing group; later groups stay "pending"
            if recipient.routing_order == min_order:
                recipient.status = RecipientStatus.sent
    # Log audit event
    audit = AuditEvent(
        envelope_id=envelope.id,
        recipient_id=None,
        event_type="envelope_sent",
        details={"subject": envelope.subject, "sent_at": envelope.sent_at.isoformat()},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(envelope)
    return envelope


async def void_envelope(
    db: AsyncSession, envelope: Envelope, data: VoidEnvelopeRequest
) -> Envelope:
    validate_transition(envelope.status, EnvelopeStatus.voided)
    envelope.status = EnvelopeStatus.voided
    # Log audit event with the void reason
    audit = AuditEvent(
        envelope_id=envelope.id,
        recipient_id=None,
        event_type="envelope_voided",
        details={"reason": data.reason or "No reason provided"},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(envelope)
    return envelope


async def resend_envelope(db: AsyncSession, envelope: Envelope) -> Envelope:
    if envelope.status not in (EnvelopeStatus.sent, EnvelopeStatus.delivered):
        from fastapi import HTTPException, status as http_status
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="Can only resend a sent or delivered envelope",
        )
    resent_recipients = []
    for recipient in envelope.recipients:
        if recipient.status in (RecipientStatus.sent, RecipientStatus.pending):
            recipient.status = RecipientStatus.sent
            # Regenerate signing token so old links are invalidated
            recipient.signing_token = str(uuid.uuid4())
            resent_recipients.append(recipient.email)
    # Log audit event
    audit = AuditEvent(
        envelope_id=envelope.id,
        recipient_id=None,
        event_type="envelope_resent",
        details={"resent_to": resent_recipients},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(envelope)
    return envelope


# ── Document operations ───────────────────────────────────────────────────────

async def get_document(db: AsyncSession, doc_id: uuid.UUID) -> Document | None:
    result = await db.execute(select(Document).where(Document.id == doc_id))
    return result.scalar_one_or_none()


async def delete_document(db: AsyncSession, doc: Document) -> None:
    await db.delete(doc)
    await db.commit()


# ── Recipient CRUD ────────────────────────────────────────────────────────────

async def add_recipient(
    db: AsyncSession, envelope: Envelope, data: RecipientCreate
) -> Recipient:
    recipient = Recipient(
        envelope_id=envelope.id,
        name=data.name,
        email=data.email,
        role=data.role,
        routing_order=data.routing_order,
    )
    # Set access_code explicitly after construction to ensure it is persisted
    if data.access_code:
        recipient.access_code = data.access_code
    db.add(recipient)
    await db.commit()
    await db.refresh(recipient)
    return recipient


async def get_recipient(db: AsyncSession, recipient_id: uuid.UUID) -> Recipient | None:
    result = await db.execute(select(Recipient).where(Recipient.id == recipient_id))
    return result.scalar_one_or_none()


async def update_recipient(
    db: AsyncSession, recipient: Recipient, data: RecipientUpdate
) -> Recipient:
    if data.name is not None:
        recipient.name = data.name
    if data.email is not None:
        recipient.email = data.email
    if data.role is not None:
        recipient.role = data.role
    if data.routing_order is not None:
        recipient.routing_order = data.routing_order
    if data.access_code is not None:
        recipient.access_code = data.access_code if data.access_code != "" else None
    await db.commit()
    await db.refresh(recipient)
    return recipient


async def delete_recipient(db: AsyncSession, recipient: Recipient) -> None:
    await db.delete(recipient)
    await db.commit()


# ── Field CRUD ────────────────────────────────────────────────────────────────

async def create_field(
    db: AsyncSession, document_id: uuid.UUID, data: FieldCreate
) -> Field:
    field = Field(
        document_id=document_id,
        recipient_id=data.recipient_id,
        type=data.type,
        page=data.page,
        x=data.x,
        y=data.y,
        width=data.width,
        height=data.height,
        required=data.required,
        label=data.label,
    )
    db.add(field)
    await db.commit()
    await db.refresh(field)
    return field


async def get_field(db: AsyncSession, field_id: uuid.UUID) -> Field | None:
    result = await db.execute(select(Field).where(Field.id == field_id))
    return result.scalar_one_or_none()


async def update_field(db: AsyncSession, field: Field, data: FieldUpdate) -> Field:
    for attr, value in data.model_dump(exclude_none=True).items():
        setattr(field, attr, value)
    await db.commit()
    await db.refresh(field)
    return field


async def delete_field(db: AsyncSession, field: Field) -> None:
    await db.delete(field)
    await db.commit()


async def get_fields_for_envelope(
    db: AsyncSession, envelope_id: uuid.UUID
) -> list[Field]:
    result = await db.execute(
        select(Field)
        .join(Document, Field.document_id == Document.id)
        .where(Document.envelope_id == envelope_id)
    )
    return result.scalars().all()


async def save_fields_for_envelope(
    db: AsyncSession,
    envelope_id: uuid.UUID,
    field_items: list,
) -> list[Field]:
    """Replace all fields for an envelope with the given list (upsert by id)."""
    from app.envelopes.schemas import FieldBulkItem

    # Fetch all current fields for this envelope
    existing = await get_fields_for_envelope(db, envelope_id)
    existing_by_id = {f.id: f for f in existing}

    incoming_ids: set[uuid.UUID] = set()
    result_fields: list[Field] = []

    for item in field_items:
        if item.id and item.id in existing_by_id:
            # Update existing
            field = existing_by_id[item.id]
            field.recipient_id = item.recipient_id
            field.type = item.type
            field.page = item.page
            field.x = item.x
            field.y = item.y
            field.width = item.width
            field.height = item.height
            field.required = item.required
            field.label = item.label
            field.value = item.value
            incoming_ids.add(item.id)
            result_fields.append(field)
        else:
            # Create new
            new_field = Field(
                document_id=item.document_id,
                recipient_id=item.recipient_id,
                type=item.type,
                page=item.page,
                x=item.x,
                y=item.y,
                width=item.width,
                height=item.height,
                required=item.required,
                label=item.label,
                value=item.value,
            )
            db.add(new_field)
            result_fields.append(new_field)

    # Delete fields that were removed
    for field_id, field in existing_by_id.items():
        if field_id not in incoming_ids:
            await db.delete(field)

    await db.commit()

    # Refresh all result fields to get DB-assigned ids
    for f in result_fields:
        await db.refresh(f)

    return result_fields


# ── Comment CRUD ──────────────────────────────────────────────────────────────

async def list_comments(db: AsyncSession, envelope_id: uuid.UUID) -> list[Comment]:
    from app.auth.models import User
    result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.envelope_id == envelope_id)
        .order_by(Comment.created_at.asc())
    )
    return result.scalars().all()


async def create_comment(
    db: AsyncSession, envelope_id: uuid.UUID, user_id: int, data: CommentCreate
) -> Comment:
    comment = Comment(
        envelope_id=envelope_id,
        user_id=user_id,
        text=data.text,
    )
    db.add(comment)
    await db.commit()
    # reload with author
    result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.id == comment.id)
    )
    return result.scalar_one()


# ── Correct in-flight ─────────────────────────────────────────────────────────

async def correct_envelope(db: AsyncSession, envelope: Envelope) -> Envelope:
    """Transition a sent/delivered envelope back to draft so recipients/fields can be edited."""
    from fastapi import HTTPException, status as http_status
    if envelope.status not in (EnvelopeStatus.sent, EnvelopeStatus.delivered):
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="Only sent or delivered envelopes can be corrected",
        )
    envelope.status = EnvelopeStatus.draft
    # Reset recipient statuses so they can be re-sent
    for recipient in envelope.recipients:
        if recipient.status in (RecipientStatus.sent, RecipientStatus.delivered):
            recipient.status = RecipientStatus.pending
    audit = AuditEvent(
        envelope_id=envelope.id,
        recipient_id=None,
        event_type="envelope_corrected",
        details={"corrected_at": datetime.now(timezone.utc).isoformat()},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(envelope)
    return envelope


async def resend_corrected_envelope(db: AsyncSession, envelope: Envelope) -> Envelope:
    """Re-send a corrected (now draft) envelope."""
    from fastapi import HTTPException, status as http_status
    if envelope.status != EnvelopeStatus.draft:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="Envelope must be in draft state to resend after correction",
        )
    if not envelope.recipients:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Envelope must have at least one recipient before sending",
        )
    return await send_envelope(db, envelope)
