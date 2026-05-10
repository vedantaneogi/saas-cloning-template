import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Background scheduler ──────────────────────────────────────────────────────

async def _run_reminder_and_expiry_loop() -> None:
    """Periodically:
    1. Send auto-reminder emails to pending recipients on envelopes where
       reminder_days > 0 and it has been at least `reminder_days` days since
       the envelope was sent (or since the last reminder).
    2. Auto-void envelopes whose expires_at has passed and are still open.

    Runs every hour so the cadence resolution is ±1 hour.
    """
    # Import here to avoid circular imports at module load time
    from sqlalchemy import select, update
    from sqlalchemy.orm import selectinload
    from app.db.session import AsyncSessionLocal
    from app.envelopes.models import (
        Envelope, EnvelopeStatus, AuditEvent, Recipient, RecipientStatus
    )
    from app.core.email import send_signing_invitation

    INTERVAL_SECONDS = 3600  # run every hour

    while True:
        try:
            async with AsyncSessionLocal() as db:
                now = datetime.now(timezone.utc)

                # ── 1. Auto-void expired envelopes ────────────────────────
                expired_result = await db.execute(
                    select(Envelope)
                    .options(selectinload(Envelope.owner))
                    .where(
                        Envelope.expires_at.isnot(None),
                        Envelope.expires_at <= now,
                        Envelope.status.in_([EnvelopeStatus.sent, EnvelopeStatus.delivered]),
                    )
                )
                expired_envelopes = expired_result.scalars().all()
                for env in expired_envelopes:
                    env.status = EnvelopeStatus.voided
                    audit = AuditEvent(
                        envelope_id=env.id,
                        recipient_id=None,
                        event_type="envelope_voided",
                        details={
                            "reason": "Automatically voided: envelope expired",
                            "expires_at": env.expires_at.isoformat() if env.expires_at else None,
                            "voided_at": now.isoformat(),
                        },
                    )
                    db.add(audit)
                    logger.info("Auto-voided expired envelope %s (expires_at=%s)", env.id, env.expires_at)
                    if env.owner:
                        try:
                            from app.core.email import send_voided_notification
                            await send_voided_notification(
                                owner_email=env.owner.email,
                                owner_name=env.owner.name or "",
                                envelope_subject=env.subject,
                                reason="Envelope expired and was automatically voided",
                            )
                        except Exception as email_err:
                            logger.warning("Failed to send expiration notification for %s: %s", env.id, email_err)

                if expired_envelopes:
                    await db.commit()

                # ── 2. Send auto-reminders ────────────────────────────────
                reminder_result = await db.execute(
                    select(Envelope)
                    .options(
                        selectinload(Envelope.recipients),
                        selectinload(Envelope.owner),
                    )
                    .where(
                        Envelope.reminder_days > 0,
                        Envelope.status.in_([EnvelopeStatus.sent, EnvelopeStatus.delivered]),
                        Envelope.sent_at.isnot(None),
                    )
                )
                reminder_envelopes = reminder_result.scalars().all()

                for env in reminder_envelopes:
                    if not env.sent_at or not env.reminder_days:
                        continue

                    # Determine the reference date: the latest of sent_at and the
                    # most recent "reminder_sent" audit event for this envelope.
                    # If the last reminder was sent less than reminder_days ago, skip.
                    last_reminder_result = await db.execute(
                        select(AuditEvent.created_at)
                        .where(
                            AuditEvent.envelope_id == env.id,
                            AuditEvent.event_type == "reminder_sent",
                        )
                        .order_by(AuditEvent.created_at.desc())
                        .limit(1)
                    )
                    last_reminder_at = last_reminder_result.scalar_one_or_none()
                    reference_dt: datetime = last_reminder_at if last_reminder_at else env.sent_at

                    # Ensure reference_dt is tz-aware
                    if reference_dt.tzinfo is None:
                        reference_dt = reference_dt.replace(tzinfo=timezone.utc)

                    next_reminder_due = reference_dt + timedelta(days=env.reminder_days)
                    if now < next_reminder_due:
                        continue  # not yet time for a reminder

                    # Send reminder to all pending/sent recipients
                    sender_name = env.owner.name if env.owner else "DocuSign Clone"
                    sender_email = env.owner.email if env.owner else ""

                    # Collect eligible recipients
                    eligible_recipients = []
                    for recipient in env.recipients:
                        if recipient.status not in (RecipientStatus.sent, RecipientStatus.delivered):
                            continue
                        if not recipient.signing_token:
                            continue
                        # Skip self-sign (sender == recipient)
                        if sender_email and recipient.email.lower() == sender_email.lower():
                            continue
                        eligible_recipients.append({
                            "email": recipient.email,
                            "name": recipient.name or "",
                            "signing_token": recipient.signing_token,
                        })

                    if eligible_recipients:
                        eligible_emails = [r["email"] for r in eligible_recipients]
                        # Record audit BEFORE sending emails so cadence tracking
                        # isn't broken by email delivery failures.
                        audit = AuditEvent(
                            envelope_id=env.id,
                            recipient_id=None,
                            event_type="reminder_sent",
                            details={
                                "sent_to": eligible_emails,
                                "reminder_days": env.reminder_days,
                                "sent_at": now.isoformat(),
                            },
                        )
                        db.add(audit)
                        await db.commit()
                        logger.info(
                            "Auto-reminder audit recorded for envelope %s to %s",
                            env.id, ", ".join(eligible_emails),
                        )

                        for r in eligible_recipients:
                            try:
                                await send_signing_invitation(
                                    recipient_email=r["email"],
                                    recipient_name=r["name"],
                                    sender_name=sender_name,
                                    sender_email=sender_email,
                                    envelope_subject=env.subject,
                                    envelope_message=env.message,
                                    signing_token=r["signing_token"],
                                    is_reminder=True,
                                )
                            except Exception as exc:
                                logger.error(
                                    "Auto-reminder: email failed for %s (envelope %s): %s",
                                    r["email"], env.id, exc,
                                )

        except Exception as exc:
            logger.error("reminder/expiry scheduler error: %s", exc)

        await asyncio.sleep(INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    os.makedirs(settings.upload_dir, exist_ok=True)
    # Start background scheduler for reminders and expiry auto-void
    scheduler_task = asyncio.create_task(_run_reminder_and_expiry_loop())
    logger.info("Reminder/expiry background scheduler started")
    try:
        yield
    finally:
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass
        logger.info("Reminder/expiry background scheduler stopped")


app = FastAPI(
    title="DocuSign Clone API",
    version="0.1.0",
    description="Electronic signature platform API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Cookie"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health")
async def root_health() -> dict:
    """Root health check for Docker/container health probes."""
    return {"status": "ok"}
