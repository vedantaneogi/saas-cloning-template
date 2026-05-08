"""DLP (Data Loss Prevention) rule engine.

Predefined hardcoded rules per the senior's spec — no Microsoft Purview.
The /evaluate endpoint takes the in-flight message draft and returns matched
rules + a final status (allow / warn / block / encrypt). Frontend uses this
to show a policy-tip banner while composing AND to re-check before send.
The same engine is invoked server-side on /messages create so a malicious
client can't bypass via dev tools.
"""

import re
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User

router = APIRouter(prefix="/dlp", tags=["DLP"])


# ─── Rule definitions ────────────────────────────────────────────────────────
# Each rule is evaluated against the draft. Action precedence: block > encrypt
# > warn > allow. The frontend renders the most-severe message at the top.

class DlpRule(BaseModel):
    id: str
    name: str
    severity: str  # info | warning | high | critical
    action: str    # allow | warn | block | encrypt
    message: str
    pattern: Optional[str] = None  # regex evaluated against subject + body
    keywords: Optional[list[str]] = None  # case-insensitive substring match
    label_when: Optional[list[str]] = None  # only fires if sensitivity matches
    requires_external: bool = False  # only fires when sending to external domain


DLP_RULES: list[DlpRule] = [
    # India-specific identifiers
    DlpRule(
        id="AADHAAR_DETECTED",
        name="Aadhaar number detected",
        severity="high",
        action="block",
        # 12-digit Aadhaar, optional spaces, must start 2-9.
        pattern=r"\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b",
        message="DLP BLOCK: Aadhaar number detected. Remove it before sending.",
    ),
    DlpRule(
        id="PAN_DETECTED",
        name="PAN number detected",
        severity="warning",
        action="warn",
        pattern=r"\b[A-Z]{5}[0-9]{4}[A-Z]\b",
        message="DLP WARNING: PAN number detected.",
    ),
    # Generic financial / personal
    DlpRule(
        id="CREDIT_CARD_DETECTED",
        name="Credit card number detected",
        severity="high",
        action="block",
        pattern=r"\b(?:\d[ -]*?){13,16}\b",
        message="DLP BLOCK: Credit card number detected.",
    ),
    DlpRule(
        id="SSN_DETECTED",
        name="US SSN detected",
        severity="high",
        action="block",
        pattern=r"\b\d{3}-\d{2}-\d{4}\b",
        message="DLP BLOCK: Social security number detected.",
    ),
    # Secrets
    DlpRule(
        id="SECRET_KEY_DETECTED",
        name="Secret or credential detected",
        severity="critical",
        action="block",
        keywords=[
            "api_key", "api-key", "secret_key", "secret-key",
            "password=", "passwd=", "private_key", "private-key",
            "access_token", "access-token", "aws_secret",
            "ssh-rsa ", "BEGIN RSA PRIVATE",
        ],
        message="DLP BLOCK: Secret or credential detected. Strip it before sending.",
    ),
    # Confidentiality keywords
    DlpRule(
        id="CONFIDENTIAL_KEYWORDS",
        name="Confidential content detected",
        severity="warning",
        action="warn",
        keywords=["confidential", "restricted", "nda", "salary", "payroll", "do not forward"],
        message="DLP WARNING: Restricted content detected.",
    ),
    # Sensitivity-label-driven rules
    DlpRule(
        id="CONFIDENTIAL_EXTERNAL_RECIPIENT",
        name="Confidential email sent externally",
        severity="warning",
        action="warn",
        label_when=["confidential", "encrypt"],
        requires_external=True,
        message="DLP WARNING: Confidential data is being sent to an external recipient.",
    ),
    DlpRule(
        id="ENCRYPT_LABEL_SET",
        name="Encrypt label selected",
        severity="info",
        action="encrypt",
        label_when=["encrypt"],
        message="This message will be encrypted. Recipients will need to authenticate.",
    ),
]


# ─── Request / response shapes ───────────────────────────────────────────────

class AddressIn(BaseModel):
    email: str
    name: Optional[str] = None


class AttachmentIn(BaseModel):
    name: str
    text_preview: Optional[str] = None


class DlpEvaluateRequest(BaseModel):
    to: list[AddressIn] = []
    cc: list[AddressIn] = []
    bcc: list[AddressIn] = []
    subject: str = ""
    body: str = ""
    attachments: list[AttachmentIn] = []
    sensitivity_label: str = "public"  # public | internal | confidential | encrypt


class PolicyTip(BaseModel):
    rule_id: str
    severity: str
    action: str
    message: str


class DlpEvaluateResponse(BaseModel):
    status: str  # allow | warn | block | encrypt
    matched_rules: list[str]
    policy_tips: list[PolicyTip]


# ─── Engine ──────────────────────────────────────────────────────────────────

def _sender_domain(email: str) -> str:
    return email.split("@")[-1].lower() if "@" in email else ""


def evaluate_dlp(req: DlpEvaluateRequest, sender_email: str) -> DlpEvaluateResponse:
    """Run every rule. Aggregate matches. Final status = highest action."""
    haystack = (req.subject or "") + "\n" + (req.body or "")
    # Strip simple HTML tags so regex/keyword search doesn't get confused
    # by <span> markup from TipTap.
    haystack_text = re.sub(r"<[^>]+>", " ", haystack)
    # Include attachment text previews + filenames in the search corpus.
    for att in req.attachments:
        haystack_text += "\n" + (att.name or "") + "\n" + (att.text_preview or "")
    haystack_lower = haystack_text.lower()

    sender_dom = _sender_domain(sender_email)
    all_recipients = list(req.to) + list(req.cc) + list(req.bcc)
    has_external = any(
        sender_dom and _sender_domain(r.email) and _sender_domain(r.email) != sender_dom
        for r in all_recipients
    )

    matched: list[PolicyTip] = []
    for rule in DLP_RULES:
        # Label gating
        if rule.label_when and req.sensitivity_label not in rule.label_when:
            continue
        # External-recipient gating
        if rule.requires_external and not has_external:
            continue
        # Pattern match
        triggered = False
        if rule.pattern:
            if re.search(rule.pattern, haystack_text):
                triggered = True
        if rule.keywords and not triggered:
            for kw in rule.keywords:
                if kw.lower() in haystack_lower:
                    triggered = True
                    break
        # Rules with neither pattern nor keywords (label-only rules) trigger
        # purely based on the gating above.
        if not rule.pattern and not rule.keywords:
            triggered = True

        if triggered:
            matched.append(PolicyTip(
                rule_id=rule.id,
                severity=rule.severity,
                action=rule.action,
                message=rule.message,
            ))

    # Final status — block > encrypt > warn > allow.
    actions = [t.action for t in matched]
    if "block" in actions:
        status = "block"
    elif "encrypt" in actions:
        status = "encrypt"
    elif "warn" in actions:
        status = "warn"
    else:
        status = "allow"

    return DlpEvaluateResponse(
        status=status,
        matched_rules=[t.rule_id for t in matched],
        policy_tips=matched,
    )


@router.post("/evaluate", response_model=DlpEvaluateResponse)
async def evaluate(
    body: DlpEvaluateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Live DLP evaluation. Frontend calls this with a debounced trigger
    while the user is composing, and again right before send."""
    return evaluate_dlp(body, current_user.email)
