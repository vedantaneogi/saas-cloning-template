import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.envelopes.models import (
    AuditEvent,
    Document,
    Envelope,
    EnvelopeStatus,
    Field,
    Recipient,
    RecipientStatus,
)
from app.signing.pdf_processor import apply_fields_to_pdf


async def get_signing_session(db: AsyncSession, token: str) -> dict:
    """Load everything needed for a signing ceremony by token."""
    result = await db.execute(
        select(Recipient)
        .options(
            selectinload(Recipient.envelope).options(
                selectinload(Envelope.documents).selectinload(Document.fields),
                selectinload(Envelope.recipients),
            )
        )
        .where(Recipient.signing_token == token)
    )
    recipient = result.scalar_one_or_none()

    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signing session not found")

    envelope = recipient.envelope
    if envelope.status not in (EnvelopeStatus.sent, EnvelopeStatus.delivered):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Envelope is not available for signing (status: {envelope.status.value})",
        )

    if recipient.status == RecipientStatus.signed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already signed this document",
        )
    if recipient.status == RecipientStatus.declined:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have declined to sign this document",
        )

    # Mark recipient as delivered if still in sent state
    if recipient.status == RecipientStatus.sent:
        recipient.status = RecipientStatus.delivered
        if envelope.status == EnvelopeStatus.sent:
            envelope.status = EnvelopeStatus.delivered
        await db.commit()
        await db.refresh(recipient)

    # Return ALL fields across all documents so the frontend can render
    # other recipients' fields as greyed-out overlays. The frontend
    # filters by recipientId itself.
    all_fields = []
    for doc in envelope.documents:
        for field in doc.fields:
            all_fields.append(field)

    return {
        "envelope": envelope,
        "recipient": recipient,
        "documents": envelope.documents,
        "fields": all_fields,
    }


async def get_document_for_signing(
    db: AsyncSession, token: str, document_id: uuid.UUID
) -> Document:
    """Return a Document row only if the token belongs to a valid recipient
    of the envelope that owns the document.  Raises 403/404 otherwise."""
    result = await db.execute(
        select(Recipient)
        .options(selectinload(Recipient.envelope).options(selectinload(Envelope.documents)))
        .where(Recipient.signing_token == token)
    )
    recipient = result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signing session not found")

    envelope = recipient.envelope
    if envelope.status not in (EnvelopeStatus.sent, EnvelopeStatus.delivered, EnvelopeStatus.completed):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    for doc in envelope.documents:
        if doc.id == document_id:
            return doc

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Document not part of this envelope")


async def submit_field(
    db: AsyncSession, token: str, field_id: uuid.UUID, value: str
) -> Field:
    result = await db.execute(
        select(Recipient).where(Recipient.signing_token == token)
    )
    recipient = result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signing session not found")

    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.recipient_id == recipient.id)
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found or does not belong to this recipient",
        )

    field.value = value
    await db.commit()
    await db.refresh(field)
    return field


async def complete_signing(db: AsyncSession, token: str, ip_address: str | None, user_agent: str | None) -> Recipient:
    result = await db.execute(
        select(Recipient)
        .options(
            selectinload(Recipient.envelope).options(
                selectinload(Envelope.recipients),
                selectinload(Envelope.documents).selectinload(Document.fields),
            )
        )
        .where(Recipient.signing_token == token)
    )
    recipient = result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signing session not found")

    envelope = recipient.envelope

    # Check all required fields are filled
    for doc in envelope.documents:
        for field in doc.fields:
            if field.recipient_id == recipient.id and field.required and not field.value:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Required field '{field.label or field.type.value}' is not filled",
                )

    recipient.status = RecipientStatus.signed
    recipient.signed_at = datetime.now(timezone.utc)

    # Log audit event
    audit = AuditEvent(
        envelope_id=envelope.id,
        recipient_id=recipient.id,
        event_type="recipient_signed",
        ip_address=ip_address,
        user_agent=user_agent,
        details={"recipient_email": recipient.email, "recipient_name": recipient.name},
    )
    db.add(audit)

    # Advance next routing group to "sent" if there are pending recipients
    # with a higher routing_order (serial routing)
    signed_order = recipient.routing_order
    pending_recipients = [
        r for r in envelope.recipients
        if r.status == RecipientStatus.pending and r.routing_order > signed_order
    ]
    if pending_recipients:
        # Find the next routing order group
        next_order = min(r.routing_order for r in pending_recipients)
        for r in pending_recipients:
            if r.routing_order == next_order:
                r.status = RecipientStatus.sent

    # Check if all signers have signed
    all_signed = all(
        r.status == RecipientStatus.signed
        for r in envelope.recipients
        if r.role.value in ("signer", "approver")
    )
    if all_signed:
        envelope.status = EnvelopeStatus.completed
        envelope.completed_at = datetime.now(timezone.utc)
        completion_audit = AuditEvent(
            envelope_id=envelope.id,
            recipient_id=None,
            event_type="envelope_completed",
            details={"completed_at": envelope.completed_at.isoformat()},
        )
        db.add(completion_audit)

    await db.commit()
    await db.refresh(recipient)
    return recipient


async def decline_signing(
    db: AsyncSession, token: str, reason: str | None, ip_address: str | None, user_agent: str | None
) -> Recipient:
    result = await db.execute(
        select(Recipient)
        .options(selectinload(Recipient.envelope))
        .where(Recipient.signing_token == token)
    )
    recipient = result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signing session not found")

    envelope = recipient.envelope
    recipient.status = RecipientStatus.declined
    recipient.declined_at = datetime.now(timezone.utc)
    recipient.decline_reason = reason

    envelope.status = EnvelopeStatus.declined

    audit = AuditEvent(
        envelope_id=envelope.id,
        recipient_id=recipient.id,
        event_type="recipient_declined",
        ip_address=ip_address,
        user_agent=user_agent,
        details={"reason": reason, "recipient_email": recipient.email},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(recipient)
    return recipient
