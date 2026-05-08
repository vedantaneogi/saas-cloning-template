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
                selectinload(Envelope.owner),
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
        select(Recipient)
        .options(selectinload(Recipient.envelope))
        .where(Recipient.signing_token == token)
    )
    recipient = result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signing session not found")

    if recipient.status in (RecipientStatus.signed, RecipientStatus.declined):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot modify fields after signing is finalized",
        )

    envelope = recipient.envelope
    if envelope.status not in (EnvelopeStatus.sent, EnvelopeStatus.delivered):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Envelope is no longer available for signing",
        )

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
    from app.envelopes.models import RecipientRole

    # Load recipient first (no lock yet)
    result = await db.execute(
        select(Recipient).where(Recipient.signing_token == token)
    )
    recipient = result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signing session not found")

    if recipient.role in (RecipientRole.cc, RecipientRole.viewer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only signers and approvers can complete signing",
        )
    if recipient.status == RecipientStatus.signed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This recipient has already signed",
        )
    if recipient.status == RecipientStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This recipient has not been activated for signing yet",
        )

    # Lock the envelope row to serialize concurrent completions
    env_result = await db.execute(
        select(Envelope)
        .options(selectinload(Envelope.owner))
        .where(Envelope.id == recipient.envelope_id)
        .with_for_update()
    )
    envelope = env_result.scalar_one()

    # Reload all recipients and fields under the lock
    recip_result = await db.execute(
        select(Recipient).where(Recipient.envelope_id == envelope.id)
    )
    all_recipients = list(recip_result.scalars().all())

    doc_result = await db.execute(
        select(Document)
        .options(selectinload(Document.fields))
        .where(Document.envelope_id == envelope.id)
    )
    docs = list(doc_result.scalars().all())

    # Re-fetch current recipient from the locked set
    recipient = next((r for r in all_recipients if r.signing_token == token), recipient)

    # Re-check status under lock — prevents double-completion from concurrent requests
    if recipient.status == RecipientStatus.signed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This recipient has already signed",
        )

    # Check all required fields are filled (formula fields are auto-computed, skip them)
    all_fields_flat = [f for doc in docs for f in doc.fields]
    label_to_field_value: dict[str, str | None] = {
        f.label: f.value for f in all_fields_flat if f.label
    }
    id_to_field_value: dict[str, str | None] = {
        str(f.id): f.value for f in all_fields_flat
    }
    for doc in docs:
        for field in doc.fields:
            if field.recipient_id == recipient.id and field.required and not field.value:
                if field.type.value == "formula":
                    continue  # formula fields will be computed below
                # Skip conditionally hidden fields
                if field.conditional_on:
                    parent_val = id_to_field_value.get(field.conditional_on)
                    matches = parent_val == field.conditional_value
                    action = field.conditional_action or "show"
                    if (action == "show" and not matches) or (action == "hide" and matches):
                        continue  # field is hidden, skip validation
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Required field '{field.label or field.type.value}' is not filled",
                )

    # Evaluate formula fields — build a label→value map and compute each formula
    all_fields = [f for doc in docs for f in doc.fields]
    label_to_value: dict[str, str] = {}
    for f in all_fields:
        if f.label and f.value is not None:
            label_to_value[f.label] = f.value
    for f in all_fields:
        if f.type.value == "formula" and f.formula:
            try:
                from app.signing.formula import evaluate_formula
                result = evaluate_formula(f.formula, label_to_value)
                dp = f.decimal_places if f.decimal_places is not None else 2
                try:
                    numeric = float(result)
                    f.value = f"{numeric:.{dp}f}"
                except (ValueError, TypeError):
                    f.value = str(result)
            except Exception:
                pass  # leave value as-is on error

    recipient.status = RecipientStatus.signed
    recipient.signed_at = datetime.now(timezone.utc)

    audit = AuditEvent(
        envelope_id=envelope.id,
        recipient_id=recipient.id,
        event_type="recipient_signed",
        ip_address=ip_address,
        user_agent=user_agent,
        details={"recipient_email": recipient.email, "recipient_name": recipient.name},
    )
    db.add(audit)

    # Advance next routing group
    signed_order = recipient.routing_order
    pending_recipients = [
        r for r in all_recipients
        if r.status == RecipientStatus.pending and r.routing_order > signed_order
    ]
    if pending_recipients:
        next_order = min(r.routing_order for r in pending_recipients)
        for r in pending_recipients:
            if r.routing_order == next_order:
                r.status = RecipientStatus.sent

    # Check completion — re-read from all_recipients (includes our update)
    all_signed = all(
        r.status == RecipientStatus.signed
        for r in all_recipients
        if r.role in (RecipientRole.signer, RecipientRole.approver, RecipientRole.in_person)
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

    # Send email notifications after commit
    from app.core.email import send_signing_invitation, send_completion_notification

    owner = envelope.owner

    # If next routing group was just activated, email those recipients
    if pending_recipients:
        next_order_val = min(r.routing_order for r in pending_recipients)
        sender_name = owner.name if owner else "DocuSign Clone"
        sender_email = owner.email if owner else ""
        for r in pending_recipients:
            if r.routing_order == next_order_val and r.signing_token:
                await send_signing_invitation(
                    recipient_email=r.email,
                    recipient_name=r.name or "",
                    sender_name=sender_name,
                    sender_email=sender_email,
                    envelope_subject=envelope.subject,
                    envelope_message=envelope.message,
                    signing_token=r.signing_token,
                    is_reminder=False,
                )

    # If envelope is now fully completed, notify the owner
    if all_signed and owner:
        await send_completion_notification(
            owner_email=owner.email,
            owner_name=owner.name or "",
            envelope_subject=envelope.subject,
            envelope_id=str(envelope.id),
        )

    return recipient


async def decline_signing(
    db: AsyncSession, token: str, reason: str | None, ip_address: str | None, user_agent: str | None
) -> Recipient:
    from app.envelopes.state_machine import validate_transition

    result = await db.execute(
        select(Recipient)
        .options(
            selectinload(Recipient.envelope).selectinload(Envelope.recipients),
            selectinload(Recipient.envelope).selectinload(Envelope.owner),
        )
        .where(Recipient.signing_token == token)
    )
    recipient = result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signing session not found")

    if recipient.status in (RecipientStatus.signed, RecipientStatus.declined):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot decline — this recipient has already {recipient.status.value}",
        )

    envelope = recipient.envelope
    validate_transition(envelope.status, EnvelopeStatus.declined)

    recipient.status = RecipientStatus.declined
    recipient.declined_at = datetime.now(timezone.utc)
    recipient.decline_reason = reason

    envelope.status = EnvelopeStatus.declined

    # Invalidate tokens for remaining non-signed recipients
    for r in envelope.recipients:
        if r.id != recipient.id and r.status in (RecipientStatus.pending, RecipientStatus.sent, RecipientStatus.delivered):
            r.signing_token = str(uuid.uuid4())

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

    # Notify envelope owner that a recipient declined
    from app.core.email import send_declined_notification

    if envelope.owner:
        await send_declined_notification(
            owner_email=envelope.owner.email,
            owner_name=envelope.owner.name or "",
            envelope_subject=envelope.subject,
            decliner_name=recipient.name or recipient.email,
            decliner_email=recipient.email,
            reason=reason,
        )

    return recipient
