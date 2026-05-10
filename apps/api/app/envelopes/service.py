import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.envelopes.models import (
    AuditEvent,
    Comment,
    Document,
    Envelope,
    EnvelopeStatus,
    Field,
    Folder,
    Recipient,
    RecipientRole,
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
from fastapi import HTTPException, status
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
    if data.allow_comments is not None:
        envelope.allow_comments = data.allow_comments
    if data.responsive_signing is not None:
        envelope.responsive_signing = data.responsive_signing
    if data.allow_reassign is not None:
        envelope.allow_reassign = data.allow_reassign
    db.add(envelope)
    await db.commit()
    await db.refresh(envelope)
    return envelope


async def list_envelopes(
    db: AsyncSession,
    user_id: int,
    status: Optional[EnvelopeStatus] = None,
    statuses: Optional[list[EnvelopeStatus]] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    envelope_id: Optional[str] = None,
    recipient_search: Optional[str] = None,
    shared: Optional[bool] = None,
    current_user_email: Optional[str] = None,
    folder_id: Optional[str] = None,
    moved_to: Optional[str] = None,
    expiring_soon: bool = False,
    action_required: bool = False,
    auth_failed: bool = False,
    inbox: bool = False,
) -> tuple[list[Envelope], int]:
    from datetime import timezone as _tz, timedelta
    from sqlalchemy import exists, and_, or_

    if inbox and current_user_email:
        # "Inbox" — envelopes where the current user is either the sender OR
        # a recipient, filtered to sent/delivered/completed status.
        base = (
            select(Envelope)
            .outerjoin(Recipient, Recipient.envelope_id == Envelope.id)
            .where(
                or_(
                    Envelope.user_id == user_id,
                    func.lower(Recipient.email) == current_user_email.lower(),
                ),
            )
            .distinct()
        )
    elif action_required and current_user_email:
        # "Action Required" — envelopes where the current user is a recipient
        # who still needs to sign (recipient status is "sent" or "delivered",
        # i.e. not yet signed/declined).  The envelope itself is sent or delivered.
        base = (
            select(Envelope)
            .join(Recipient, Recipient.envelope_id == Envelope.id)
            .where(
                func.lower(Recipient.email) == current_user_email.lower(),
                Recipient.status.in_([RecipientStatus.sent, RecipientStatus.delivered]),
                Envelope.status.in_([EnvelopeStatus.sent, EnvelopeStatus.delivered]),
            )
            .distinct()
        )
    elif shared and current_user_email:
        # "Shared with Me" mode: envelopes where the current user appears as a
        # recipient (any role) but is NOT the envelope owner.
        base = (
            select(Envelope)
            .join(Recipient, Recipient.envelope_id == Envelope.id)
            .where(
                func.lower(Recipient.email) == current_user_email.lower(),
                Envelope.user_id != user_id,
            )
            .distinct()
        )
    else:
        base = select(Envelope).where(Envelope.user_id == user_id)

    # "Deleted" virtual view — filter by moved_to="deleted"
    if moved_to == "deleted":
        base = base.where(Envelope.moved_to == "deleted")
    elif moved_to:
        base = base.where(Envelope.moved_to == moved_to)
    else:
        # Map sidebar view names to status values and vice versa
        _view_to_status = {"inbox": "delivered", "sent": "sent", "completed": "completed"}
        _status_to_view = {v: k for k, v in _view_to_status.items()}

        if statuses:
            base = base.where(Envelope.status.in_(statuses))
            # Exclude soft-deleted envelopes from normal views
            base = base.where(or_(Envelope.moved_to.is_(None), Envelope.moved_to != "deleted"))
        elif status:
            status_val = status.value if hasattr(status, 'value') else str(status)
            view_name = _status_to_view.get(status_val)
            if status_val == "sent":
                base = base.where(
                    or_(
                        and_(Envelope.status.in_([EnvelopeStatus.sent, EnvelopeStatus.delivered]), Envelope.moved_to.is_(None)),
                        Envelope.moved_to == "sent",
                    )
                )
            else:
                base = base.where(
                    or_(
                        and_(Envelope.status == status, Envelope.moved_to.is_(None)),
                        Envelope.moved_to == view_name if view_name else Envelope.status == status,
                    )
                )
            # Exclude soft-deleted envelopes from normal views
            base = base.where(or_(Envelope.moved_to.is_(None), Envelope.moved_to != "deleted"))
        else:
            # No status filter but also not a moved_to filter — exclude deleted
            base = base.where(or_(Envelope.moved_to.is_(None), Envelope.moved_to != "deleted"))

    # "Expiring Soon" — envelopes that have an expires_at within the next 30 days
    if expiring_soon:
        now = datetime.now(_tz.utc)
        thirty_days = now + timedelta(days=30)
        base = base.where(
            Envelope.expires_at.isnot(None),
            Envelope.expires_at > now,
            Envelope.expires_at <= thirty_days,
            Envelope.status.in_([EnvelopeStatus.sent, EnvelopeStatus.delivered]),
        )

    # "Authentication Failed" — envelopes with recipients that have access codes set.
    # This serves as a proxy for envelopes that use recipient authentication.
    # A full implementation would track per-attempt failures, but for now we show
    # envelopes whose recipients have access_code protection.
    if auth_failed:
        base = base.where(
            exists().where(
                and_(
                    Recipient.envelope_id == Envelope.id,
                    Recipient.access_code.isnot(None),
                )
            )
        )
        base = base.where(
            Envelope.status.in_([EnvelopeStatus.sent, EnvelopeStatus.delivered]),
        )

    # Date range filtering on created_at
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            if dt_from.tzinfo is None:
                dt_from = dt_from.replace(tzinfo=_tz.utc)
            base = base.where(Envelope.created_at >= dt_from)
        except ValueError:
            pass  # ignore malformed dates
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            if dt_to.tzinfo is None:
                dt_to = dt_to.replace(tzinfo=_tz.utc)
            base = base.where(Envelope.created_at <= dt_to)
        except ValueError:
            pass  # ignore malformed dates

    # Direct envelope ID lookup (partial match on the UUID string)
    if envelope_id:
        base = base.where(Envelope.id.cast(String).ilike(f"%{envelope_id}%"))

    if folder_id:
        base = base.where(Envelope.folder_id == folder_id)
    elif status and not statuses:
        # Only restrict to no-folder when a single explicit status filter is given
        # (i.e. the user navigated to a status-filtered view, not a virtual view like
        # "inbox", "waiting_for_others", or "expiring_soon" which use a statuses list).
        base = base.where(Envelope.folder_id.is_(None))

    # Search: subject ILIKE OR recipient name/email ILIKE
    if search or recipient_search:
        term = search or recipient_search
        subject_match = Envelope.subject.ilike(f"%{term}%")
        recipient_match = exists().where(
            and_(
                Recipient.envelope_id == Envelope.id,
                Recipient.name.ilike(f"%{term}%") | Recipient.email.ilike(f"%{term}%"),
            )
        )
        if search:
            # Search across subject AND recipients
            base = base.where(subject_match | recipient_match)
        else:
            # recipient_search only — search recipients exclusively
            base = base.where(recipient_match)

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # When DISTINCT is used (action_required / shared views), PostgreSQL requires
    # ORDER BY columns to appear in the SELECT list. Resolve by selecting IDs via
    # the DISTINCT subquery, then fetching full Envelope rows ordered outside it.
    id_subq = base.with_only_columns(Envelope.id).subquery()
    query = (
        select(Envelope)
        .where(Envelope.id.in_(select(id_subq.c.id)))
        .options(
            selectinload(Envelope.recipients),
            selectinload(Envelope.owner),
        )
        .order_by(Envelope.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    return result.scalars().all(), total


async def get_envelope(
    db: AsyncSession, envelope_id: uuid.UUID, user_id: int, user_email: str | None = None
) -> Envelope | None:
    from sqlalchemy import or_, exists, and_

    ownership = [Envelope.user_id == user_id]
    if user_email:
        recipient_match = exists(
            select(Recipient.id).where(
                Recipient.envelope_id == Envelope.id,
                func.lower(Recipient.email) == user_email.lower(),
            )
        )
        ownership = [or_(Envelope.user_id == user_id, recipient_match)]

    result = await db.execute(
        select(Envelope)
        .options(
            selectinload(Envelope.documents).selectinload(Document.fields),
            selectinload(Envelope.recipients).selectinload(Recipient.fields),
            selectinload(Envelope.owner),
        )
        .where(Envelope.id == envelope_id, *ownership)
    )
    return result.scalar_one_or_none()


async def update_envelope(
    db: AsyncSession, envelope: Envelope, data: EnvelopeUpdate
) -> Envelope:
    if data.subject is not None:
        envelope.subject = data.subject
    if data.message is not None:
        envelope.message = data.message
    # Allow clearing expires_at by checking whether the field was explicitly sent
    # (model_fields_set tracks which fields were present in the request body).
    if "expires_at" in data.model_fields_set:
        envelope.expires_at = data.expires_at  # may be None → clears the value
    elif data.expires_at is not None:
        envelope.expires_at = data.expires_at
    if data.reminder_days is not None:
        envelope.reminder_days = data.reminder_days
    if data.allow_comments is not None:
        envelope.allow_comments = data.allow_comments
    if data.responsive_signing is not None:
        envelope.responsive_signing = data.responsive_signing
    if data.allow_reassign is not None:
        envelope.allow_reassign = data.allow_reassign
    if data.category is not None:
        envelope.category = data.category
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
    # Validate all recipients have valid emails
    for r in envelope.recipients:
        if not r.email or not r.email.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Recipient '{r.name or 'unnamed'}' has no email address",
            )
    envelope.status = EnvelopeStatus.sent
    envelope.sent_at = datetime.now(timezone.utc)
    # Assign signing tokens; for serial routing only activate recipients with the minimum routing_order
    min_order = min(r.routing_order for r in envelope.recipients)
    for recipient in envelope.recipients:
        if recipient.status in (RecipientStatus.signed, RecipientStatus.declined):
            continue
        recipient.signing_token = str(uuid.uuid4())
        if recipient.status == RecipientStatus.pending:
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
    # Snapshot all data needed for emails BEFORE commit — after commit SQLAlchemy
    # expires every attribute on tracked objects, causing greenlet errors on access.
    sender_name = envelope.owner.name if envelope.owner else "DocuSign Clone"
    sender_email = envelope.owner.email if envelope.owner else ""
    envelope_subject = envelope.subject
    envelope_message = envelope.message
    envelope_id = envelope.id
    recipient_data = [
        {
            "email": r.email,
            "name": r.name or "",
            "role": r.role,
            "status": r.status,
            "signing_token": r.signing_token,
            "private_message": r.private_message,
        }
        for r in envelope.recipients
    ]
    await db.commit()
    await db.refresh(envelope)

    # Send signing invitation emails to first-routing-order recipients
    from app.core.email import send_signing_invitation, send_cc_notification
    import logging as _logging
    _svc_logger = _logging.getLogger(__name__)
    email_failures: list[str] = []
    for r in recipient_data:
        if r["status"] == RecipientStatus.sent and r["signing_token"]:
            # Skip email for self-sign (signer == sender). Guard against empty sender_email.
            if sender_email and r["email"].lower() == sender_email.lower():
                continue
            try:
                await send_signing_invitation(
                    recipient_email=r["email"],
                    recipient_name=r["name"],
                    sender_name=sender_name,
                    sender_email=sender_email,
                    envelope_subject=envelope_subject,
                    envelope_message=envelope_message,
                    signing_token=r["signing_token"],
                    is_reminder=False,
                    private_message=r["private_message"] or None,
                )
            except Exception as exc:
                _svc_logger.error(
                    "envelope %s: signing invite failed for %s: %s",
                    envelope_id, r["email"], exc,
                )
                email_failures.append(r["email"])

    # Send CC/viewer notifications
    for r in recipient_data:
        if r["role"] in (RecipientRole.cc, RecipientRole.viewer) and r["signing_token"]:
            try:
                await send_cc_notification(
                    cc_email=r["email"],
                    cc_name=r["name"],
                    sender_name=sender_name,
                    sender_email=sender_email,
                    envelope_subject=envelope_subject,
                    envelope_message=envelope_message,
                    signing_token=r["signing_token"],
                )
            except Exception as exc:
                _svc_logger.error(
                    "envelope %s: CC notification failed for %s: %s",
                    envelope_id, r["email"], exc,
                )
                email_failures.append(r["email"])

    if email_failures:
        _svc_logger.warning(
            "envelope %s sent but emails failed for: %s",
            envelope.id, ", ".join(email_failures),
        )

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
    resent_recipient_objs = []
    for recipient in envelope.recipients:
        if recipient.status in (RecipientStatus.sent, RecipientStatus.delivered, RecipientStatus.pending):
            recipient.status = RecipientStatus.sent
            recipient.signing_token = str(uuid.uuid4())
            resent_recipients.append(recipient.email)
            resent_recipient_objs.append(recipient)
    if not resent_recipient_objs:
        from fastapi import HTTPException, status as http_status
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="All recipients have already signed or declined — nothing to resend",
        )
    # Log audit event
    audit = AuditEvent(
        envelope_id=envelope.id,
        recipient_id=None,
        event_type="envelope_resent",
        details={"resent_to": resent_recipients},
    )
    db.add(audit)
    # Snapshot all data needed for emails BEFORE commit — after commit SQLAlchemy
    # expires every attribute on tracked objects, causing greenlet errors on access.
    sender_name = envelope.owner.name if envelope.owner else "DocuSign Clone"
    sender_email = envelope.owner.email if envelope.owner else ""
    envelope_subject = envelope.subject
    envelope_message = envelope.message
    envelope_id = envelope.id
    resent_recipient_data = [
        {
            "email": r.email,
            "name": r.name or "",
            "signing_token": r.signing_token,
            "private_message": r.private_message,
        }
        for r in resent_recipient_objs
    ]
    await db.commit()
    await db.refresh(envelope)

    # Send reminder emails to resent recipients
    from app.core.email import send_signing_invitation
    import logging
    _logger = logging.getLogger(__name__)
    for r in resent_recipient_data:
        try:
            await send_signing_invitation(
                recipient_email=r["email"],
                recipient_name=r["name"],
                sender_name=sender_name,
                sender_email=sender_email,
                envelope_subject=envelope_subject,
                envelope_message=envelope_message,
                signing_token=r["signing_token"],
                is_reminder=True,
                private_message=r["private_message"] or None,
            )
        except Exception as exc:
            _logger.error(
                "resend_envelope: email failed for %s (envelope %s): %s",
                r["email"], envelope_id, exc,
            )

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
        private_message=data.private_message or None,
        template_role_label=data.template_role_label or None,
    )
    if data.access_code:
        import hashlib
        recipient.access_code = hashlib.sha256(data.access_code.strip().encode()).hexdigest()
    if data.id_check:
        recipient.id_check = True
        recipient.access_code = None
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
        if data.access_code == "":
            recipient.access_code = None
        else:
            import hashlib
            recipient.access_code = hashlib.sha256(data.access_code.strip().encode()).hexdigest()
    if data.private_message is not None:
        recipient.private_message = data.private_message or None
    if data.template_role_label is not None:
        recipient.template_role_label = data.template_role_label or None
    if data.id_check is not None:
        recipient.id_check = data.id_check
        if data.id_check:
            recipient.access_code = None
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
        value=data.value,
        formula=data.formula,
        decimal_places=data.decimal_places,
        options=data.options,
        group_name=data.group_name,
        payment_amount=data.payment_amount,
        payment_currency=data.payment_currency,
        payment_description=data.payment_description,
        conditional_on=data.conditional_on,
        conditional_value=data.conditional_value,
        conditional_action=data.conditional_action,
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
            field.formula = getattr(item, "formula", None)
            field.decimal_places = getattr(item, "decimal_places", None)
            field.conditional_on = getattr(item, "conditional_on", None)
            field.conditional_value = getattr(item, "conditional_value", None)
            field.conditional_action = getattr(item, "conditional_action", None)
            field.options = getattr(item, "options", None)
            field.group_name = getattr(item, "group_name", None)
            field.payment_amount = getattr(item, "payment_amount", None)
            field.payment_currency = getattr(item, "payment_currency", None)
            field.payment_description = getattr(item, "payment_description", None)
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
                formula=getattr(item, "formula", None),
                decimal_places=getattr(item, "decimal_places", None),
                conditional_on=getattr(item, "conditional_on", None),
                conditional_value=getattr(item, "conditional_value", None),
                conditional_action=getattr(item, "conditional_action", None),
                options=getattr(item, "options", None),
                group_name=getattr(item, "group_name", None),
                payment_amount=getattr(item, "payment_amount", None),
                payment_currency=getattr(item, "payment_currency", None),
                payment_description=getattr(item, "payment_description", None),
            )
            db.add(new_field)
            result_fields.append(new_field)

    # Delete fields that were removed
    for field_id, field in existing_by_id.items():
        if field_id not in incoming_ids:
            await db.delete(field)

    await db.flush()

    # Build temp-ID → real-UUID map for conditional_on remapping
    id_map: dict[str, str] = {}
    for i, item in enumerate(field_items):
        frontend_id = getattr(item, "frontend_id", None)
        if frontend_id and i < len(result_fields):
            id_map[frontend_id] = str(result_fields[i].id)
        if item.id:
            id_map[str(item.id)] = str(result_fields[i].id)

    # Remap conditional_on from temp IDs to real UUIDs
    for f in result_fields:
        if f.conditional_on and f.conditional_on in id_map:
            f.conditional_on = id_map[f.conditional_on]

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


async def delete_comment(
    db: AsyncSession, comment_id: uuid.UUID, user_id: int, envelope_id: uuid.UUID
) -> bool:
    """Delete a comment by its author. Returns False if not found or not owned by user_id."""
    result = await db.execute(
        select(Comment).where(
            Comment.id == comment_id,
            Comment.envelope_id == envelope_id,
            Comment.user_id == user_id,
        )
    )
    comment = result.scalar_one_or_none()
    if not comment:
        return False
    await db.delete(comment)
    await db.commit()
    return True


# ── Correct in-flight ─────────────────────────────────────────────────────────

async def correct_envelope(db: AsyncSession, envelope: Envelope) -> Envelope:
    """Transition a sent/delivered envelope back to draft so recipients/fields can be edited."""
    validate_transition(envelope.status, EnvelopeStatus.draft)
    envelope.status = EnvelopeStatus.draft
    envelope.sent_at = None
    envelope.completed_at = None
    reset_recipients = []
    for recipient in envelope.recipients:
        if recipient.status == RecipientStatus.signed:
            reset_recipients.append(recipient.email)
        # Reset ALL recipients so the corrected envelope can be fully edited and
        # re-sent. Declined recipients are also reset because the sender may want
        # to change the recipient list or give them another opportunity to sign.
        recipient.status = RecipientStatus.pending
        recipient.signed_at = None
        recipient.declined_at = None
        recipient.decline_reason = None
        recipient.signing_token = None
    # Clear field values entered during previous signing session
    for doc in envelope.documents:
        for field in doc.fields:
            if field.value and field.type.value not in ("formula",):
                field.value = None
    audit = AuditEvent(
        envelope_id=envelope.id,
        recipient_id=None,
        event_type="envelope_corrected",
        details={
            "corrected_at": datetime.now(timezone.utc).isoformat(),
            "signatures_invalidated": reset_recipients,
        },
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


# ── Folder CRUD ───────────────────────────────────────────────────────────────

async def list_folders(db: AsyncSession, user_id: int) -> list[Folder]:
    result = await db.execute(
        select(Folder)
        .where(Folder.user_id == user_id)
        .order_by(Folder.created_at.asc())
    )
    return result.scalars().all()


async def create_folder(db: AsyncSession, user_id: int, name: str) -> Folder:
    folder = Folder(user_id=user_id, name=name.strip())
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder


async def delete_folder(db: AsyncSession, folder_id: uuid.UUID, user_id: int) -> bool:
    """Delete a folder and clear folder_id on all its envelopes. Returns False if not found."""
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == user_id)
    )
    folder = result.scalar_one_or_none()
    if not folder:
        return False
    # Clear folder_id on all envelopes in this folder
    from sqlalchemy import update
    await db.execute(
        update(Envelope)
        .where(Envelope.folder_id == folder_id)
        .values(folder_id=None)
    )
    await db.delete(folder)
    await db.commit()
    return True


async def move_envelopes(
    db: AsyncSession,
    user_id: int,
    envelope_ids: list[str],
    folder_id: str | None,
    moved_to: str | None = None,
) -> int:
    """Move envelopes to a folder or a virtual view (inbox/sent).
    moved_to="inbox"|"sent" moves to the real sidebar view.
    folder_id moves to a custom folder.
    Both None = remove from folder/view."""
    from sqlalchemy import update

    values: dict = {}

    if moved_to in ("inbox", "sent", "deleted"):
        values["moved_to"] = moved_to
        values["folder_id"] = None
    elif folder_id is not None:
        folder_uuid = uuid.UUID(folder_id)
        folder_result = await db.execute(
            select(Folder).where(Folder.id == folder_uuid, Folder.user_id == user_id)
        )
        if not folder_result.scalar_one_or_none():
            from fastapi import HTTPException, status as http_status
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Folder not found")
        values["folder_id"] = folder_uuid
        values["moved_to"] = None
    else:
        values["folder_id"] = None
        values["moved_to"] = None

    valid_ids: list[uuid.UUID] = []
    for eid in envelope_ids:
        try:
            valid_ids.append(uuid.UUID(eid))
        except ValueError:
            pass

    if not valid_ids:
        return 0

    result = await db.execute(
        update(Envelope)
        .where(Envelope.id.in_(valid_ids), Envelope.user_id == user_id)
        .values(**values)
    )
    await db.commit()
    return result.rowcount
