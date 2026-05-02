"""Admin service: seed and reset database."""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.seeds import (
    build_seed_contacts,
    build_seed_envelopes,
    build_seed_templates,
    build_seed_users,
)
from app.auth.models import User
from app.contacts.models import Contact
from app.core.security import hash_password
from app.envelopes.models import (
    AuditEvent,
    Envelope,
    EnvelopeStatus,
    Recipient,
    RecipientRole,
    RecipientStatus,
)
from app.templates.models import Template


async def truncate_all(db: AsyncSession) -> list[str]:
    """Delete all data from all tables in a safe order."""
    tables = [
        "audit_events",
        "fields",
        "documents",
        "recipients",
        "envelopes",
        "templates",
        "contacts",
        "users",
    ]
    for table in tables:
        await db.execute(text(f'DELETE FROM "{table}"'))
    await db.commit()
    return tables


async def seed_all(db: AsyncSession, reset: bool = True) -> dict[str, int]:
    if reset:
        await truncate_all(db)

    # Seed users
    users_data = build_seed_users()
    users: list[User] = []
    for ud in users_data:
        user = User(
            email=ud["email"],
            name=ud["name"],
            hashed_password=hash_password(ud["password"]),
        )
        db.add(user)
        users.append(user)
    await db.flush()

    user_id_map = {u.email: u.id for u in users}

    # Seed contacts (for the first user)
    contacts_data = build_seed_contacts()
    primary_user_id = users[0].id
    for cd in contacts_data:
        contact = Contact(
            user_id=primary_user_id,
            name=cd["name"],
            email=cd["email"],
            company=cd.get("company"),
        )
        db.add(contact)

    # Seed templates
    templates_data = build_seed_templates()
    for td in templates_data:
        template = Template(
            user_id=primary_user_id,
            name=td["name"],
            description=td.get("description"),
            fields_config=td.get("fields_config", []),
            roles=td.get("roles", []),
            document_ids=td.get("document_ids", []),
        )
        db.add(template)

    await db.flush()

    # Seed envelopes
    envelopes_data = build_seed_envelopes(user_id_map)
    envelope_count = 0
    recipient_count = 0
    audit_count = 0

    for ed in envelopes_data:
        env_status = EnvelopeStatus(ed["status"])
        envelope = Envelope(
            user_id=ed["user_id"],
            subject=ed["subject"],
            message=ed.get("message"),
            status=env_status,
        )
        if ed.get("created_at"):
            envelope.created_at = ed["created_at"]
        if ed.get("sent_at"):
            envelope.sent_at = ed["sent_at"]
        if ed.get("completed_at"):
            envelope.completed_at = ed["completed_at"]
        if ed.get("expires_at"):
            envelope.expires_at = ed["expires_at"]

        db.add(envelope)
        await db.flush()
        envelope_count += 1

        # Add recipients
        for rd in ed.get("recipients", []):
            r_status = RecipientStatus(rd.get("status", "pending"))
            if env_status == EnvelopeStatus.sent and r_status == RecipientStatus.pending:
                r_status = RecipientStatus.sent

            recipient = Recipient(
                envelope_id=envelope.id,
                name=rd["name"],
                email=rd["email"],
                role=RecipientRole(rd.get("role", "signer")),
                routing_order=rd.get("routing_order", 1),
                status=r_status,
            )
            if rd.get("signed_at"):
                recipient.signed_at = rd["signed_at"]
            if rd.get("declined_at"):
                recipient.declined_at = rd["declined_at"]
            if rd.get("decline_reason"):
                recipient.decline_reason = rd["decline_reason"]

            db.add(recipient)
            recipient_count += 1

        # Add audit events
        for ae in ed.get("audit_events", []):
            event = AuditEvent(
                envelope_id=envelope.id,
                event_type=ae["event_type"],
                details=ae.get("details"),
            )
            db.add(event)
            audit_count += 1

    await db.commit()

    return {
        "users": len(users),
        "contacts": len(contacts_data),
        "templates": len(templates_data),
        "envelopes": envelope_count,
        "recipients": recipient_count,
        "audit_events": audit_count,
    }
