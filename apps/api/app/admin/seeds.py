"""Seed data for the DocuSign clone demo environment.

POST /admin/seed populates:
- 2 users (test user + bob)
- 20+ contacts
- 3 templates
- 10+ envelopes in various states (draft, sent, completed, voided, declined)
- Audit events for non-draft envelopes
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.config import get_settings


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _days_ago(n: int) -> datetime:
    return _now() - timedelta(days=n)


def _days_from_now(n: int) -> datetime:
    return _now() + timedelta(days=n)


def get_settings_email() -> str:
    return get_settings().test_auth_email


def get_settings_name() -> str:
    return get_settings().test_auth_name


def build_seed_users() -> list[dict[str, Any]]:
    settings = get_settings()
    return [
        {
            "email": settings.test_auth_email,
            "name": settings.test_auth_name,
            "password": "seed-password-not-used",
        },
        {
            "email": "bob@docusign-demo.local",
            "name": "Bob Reviewer",
            "password": "seed-password-not-used",
        },
    ]


def build_seed_contacts() -> list[dict[str, Any]]:
    return [
        {"name": "Alice Johnson", "email": "alice.johnson@acme.com", "company": "Acme Corp"},
        {"name": "Brian Smith", "email": "brian.smith@techcorp.io", "company": "TechCorp"},
        {"name": "Carol White", "email": "carol.white@legalfirm.com", "company": "White & Associates"},
        {"name": "David Lee", "email": "david.lee@startupxyz.com", "company": "StartupXYZ"},
        {"name": "Emma Davis", "email": "emma.davis@enterprise.org", "company": "Enterprise Solutions"},
        {"name": "Frank Wilson", "email": "frank.wilson@realestate.com", "company": "Wilson Realty"},
        {"name": "Grace Martinez", "email": "grace.m@globalco.net", "company": "GlobalCo"},
        {"name": "Henry Brown", "email": "henry.brown@finance.biz", "company": "Brown Finance"},
        {"name": "Isabella Taylor", "email": "i.taylor@consulting.com", "company": "Taylor Consulting"},
        {"name": "Jack Anderson", "email": "jack.anderson@media.tv", "company": "Anderson Media"},
        {"name": "Karen Thomas", "email": "karen.t@healthcare.org", "company": "HealthFirst"},
        {"name": "Liam Jackson", "email": "liam.j@software.dev", "company": "DevSoft Inc"},
        {"name": "Mia Harris", "email": "mia.harris@retail.shop", "company": "Harris Retail"},
        {"name": "Noah Martin", "email": "noah.martin@logistics.co", "company": "FastLogistics"},
        {"name": "Olivia Garcia", "email": "olivia.g@edu.org", "company": "EduFirst"},
        {"name": "Peter Robinson", "email": "p.robinson@insurance.com", "company": "Safe Insurance"},
        {"name": "Quinn Lewis", "email": "quinn.lewis@pharma.bio", "company": "BioPharma"},
        {"name": "Rachel Clark", "email": "rachel.clark@nonprofit.org", "company": "Good Cause"},
        {"name": "Sam Rodriguez", "email": "sam.r@manufacturing.com", "company": "ManuCo"},
        {"name": "Tina Walker", "email": "tina.walker@events.com", "company": "Walker Events"},
        {"name": "Uma Hall", "email": "uma.hall@agency.co", "company": "Creative Agency"},
        {"name": "Victor Allen", "email": "victor.allen@banking.com", "company": "Allied Bank"},
    ]


def build_seed_templates() -> list[dict[str, Any]]:
    return [
        {
            "name": "Standard NDA",
            "description": "Non-disclosure agreement for new hires and contractors",
            "roles": [
                {"name": "Signer", "role": "signer", "routing_order": 1},
                {"name": "Company Rep", "role": "approver", "routing_order": 2},
            ],
            "fields_config": [
                {"type": "signature", "page": 1, "x": 400, "y": 650, "width": 150, "height": 50, "label": "Signer Signature"},
                {"type": "date_signed", "page": 1, "x": 400, "y": 710, "width": 150, "height": 30, "label": "Date"},
                {"type": "text", "page": 1, "x": 100, "y": 200, "width": 300, "height": 30, "label": "Full Legal Name"},
                {"type": "text", "page": 1, "x": 100, "y": 240, "width": 300, "height": 30, "label": "Company Name"},
            ],
            "document_ids": [],
        },
        {
            "name": "Service Agreement",
            "description": "Standard service agreement for freelancers and vendors",
            "roles": [
                {"name": "Client", "role": "signer", "routing_order": 1},
                {"name": "Service Provider", "role": "signer", "routing_order": 2},
            ],
            "fields_config": [
                {"type": "signature", "page": 3, "x": 100, "y": 600, "width": 150, "height": 50, "label": "Client Signature"},
                {"type": "signature", "page": 3, "x": 350, "y": 600, "width": 150, "height": 50, "label": "Provider Signature"},
                {"type": "date_signed", "page": 3, "x": 100, "y": 660, "width": 120, "height": 30, "label": "Date"},
                {"type": "initial", "page": 1, "x": 480, "y": 750, "width": 60, "height": 30, "label": "Initials"},
                {"type": "initial", "page": 2, "x": 480, "y": 750, "width": 60, "height": 30, "label": "Initials"},
            ],
            "document_ids": [],
        },
        {
            "name": "Employment Offer Letter",
            "description": "Offer letter with salary and start date confirmation",
            "roles": [
                {"name": "Candidate", "role": "signer", "routing_order": 1},
                {"name": "HR Manager", "role": "cc", "routing_order": 2},
            ],
            "fields_config": [
                {"type": "signature", "page": 2, "x": 80, "y": 580, "width": 180, "height": 55, "label": "Candidate Signature"},
                {"type": "date_signed", "page": 2, "x": 300, "y": 580, "width": 130, "height": 30, "label": "Acceptance Date"},
                {"type": "checkbox", "page": 1, "x": 80, "y": 400, "width": 20, "height": 20, "label": "Agree to terms"},
            ],
            "document_ids": [],
        },
    ]


def build_seed_envelopes(user_ids: dict[str, int]) -> list[dict[str, Any]]:
    """Build envelope seed data. user_ids maps email -> id."""
    settings = get_settings()
    alice_id = user_ids.get(settings.test_auth_email, 1)
    bob_id = user_ids.get("bob@docusign-demo.local", 2)

    return [
        # Drafts
        {
            "user_id": alice_id,
            "subject": "NDA - Acme Corp Partnership",
            "message": "Please review and sign the non-disclosure agreement.",
            "status": "draft",
            "created_at": _days_ago(2),
            "recipients": [
                {"name": "Alice Johnson", "email": "alice.johnson@acme.com", "role": "signer", "routing_order": 1},
            ],
        },
        {
            "user_id": alice_id,
            "subject": "Service Agreement - TechCorp Q4",
            "message": "Quarterly service agreement for continued support.",
            "status": "draft",
            "created_at": _days_ago(1),
            "recipients": [],
        },
        # Sent
        {
            "user_id": alice_id,
            "subject": "Employment Offer - Senior Engineer",
            "message": "Congratulations! Please sign your offer letter.",
            "status": "sent",
            "sent_at": _days_ago(3),
            "created_at": _days_ago(4),
            "recipients": [
                {"name": "David Lee", "email": "david.lee@startupxyz.com", "role": "signer", "routing_order": 1},
                {"name": "Emma Davis", "email": "emma.davis@enterprise.org", "role": "cc", "routing_order": 2},
            ],
            "audit_events": [
                {"event_type": "envelope_sent", "details": {"method": "email"}},
            ],
        },
        {
            "user_id": alice_id,
            "subject": "Contractor NDA - Frank Wilson",
            "message": "Standard NDA for contractor engagement.",
            "status": "sent",
            "sent_at": _days_ago(5),
            "created_at": _days_ago(6),
            "recipients": [
                {"name": "Frank Wilson", "email": "frank.wilson@realestate.com", "role": "signer", "routing_order": 1},
            ],
            "audit_events": [
                {"event_type": "envelope_sent", "details": {"method": "email"}},
                {"event_type": "recipient_viewed", "details": {"recipient_email": "frank.wilson@realestate.com"}},
            ],
        },
        {
            "user_id": alice_id,
            "subject": "Vendor Agreement - GlobalCo 2026",
            "message": "Annual vendor agreement renewal.",
            "status": "delivered",
            "sent_at": _days_ago(7),
            "created_at": _days_ago(8),
            "recipients": [
                {"name": "Grace Martinez", "email": "grace.m@globalco.net", "role": "signer", "routing_order": 1},
                {"name": "Henry Brown", "email": "henry.brown@finance.biz", "role": "approver", "routing_order": 2},
            ],
            "audit_events": [
                {"event_type": "envelope_sent", "details": {}},
                {"event_type": "recipient_viewed", "details": {"recipient_email": "grace.m@globalco.net"}},
                {"event_type": "recipient_delivered", "details": {"recipient_email": "grace.m@globalco.net"}},
            ],
        },
        # Completed
        {
            "user_id": alice_id,
            "subject": "Q3 Partnership Agreement - TechCorp",
            "message": "Partnership terms for Q3 2025.",
            "status": "completed",
            "sent_at": _days_ago(30),
            "completed_at": _days_ago(28),
            "created_at": _days_ago(32),
            "recipients": [
                {"name": "Brian Smith", "email": "brian.smith@techcorp.io", "role": "signer", "routing_order": 1, "status": "signed", "signed_at": _days_ago(28)},
                {"name": "Isabella Taylor", "email": "i.taylor@consulting.com", "role": "cc", "routing_order": 2, "status": "signed", "signed_at": _days_ago(28)},
            ],
            "audit_events": [
                {"event_type": "envelope_sent", "details": {}},
                {"event_type": "recipient_signed", "details": {"recipient_email": "brian.smith@techcorp.io"}},
                {"event_type": "envelope_completed", "details": {"completed_at": _days_ago(28).isoformat()}},
            ],
        },
        {
            "user_id": alice_id,
            "subject": "Consulting Contract - Taylor Associates",
            "message": "Six-month consulting engagement terms.",
            "status": "completed",
            "sent_at": _days_ago(45),
            "completed_at": _days_ago(43),
            "created_at": _days_ago(46),
            "recipients": [
                {"name": "Isabella Taylor", "email": "i.taylor@consulting.com", "role": "signer", "routing_order": 1, "status": "signed", "signed_at": _days_ago(43)},
            ],
            "audit_events": [
                {"event_type": "envelope_sent", "details": {}},
                {"event_type": "recipient_signed", "details": {"recipient_email": "i.taylor@consulting.com"}},
                {"event_type": "envelope_completed", "details": {}},
            ],
        },
        {
            "user_id": alice_id,
            "subject": "SaaS Subscription Agreement - MediaCo",
            "message": "Annual SaaS subscription renewal.",
            "status": "completed",
            "sent_at": _days_ago(60),
            "completed_at": _days_ago(57),
            "created_at": _days_ago(61),
            "recipients": [
                {"name": "Jack Anderson", "email": "jack.anderson@media.tv", "role": "signer", "routing_order": 1, "status": "signed", "signed_at": _days_ago(57)},
            ],
            "audit_events": [
                {"event_type": "envelope_sent", "details": {}},
                {"event_type": "recipient_signed", "details": {"recipient_email": "jack.anderson@media.tv"}},
                {"event_type": "envelope_completed", "details": {}},
            ],
        },
        # Declined
        {
            "user_id": alice_id,
            "subject": "License Agreement - HealthFirst",
            "message": "Software license for HealthFirst portal.",
            "status": "declined",
            "sent_at": _days_ago(14),
            "created_at": _days_ago(15),
            "recipients": [
                {"name": "Karen Thomas", "email": "karen.t@healthcare.org", "role": "signer", "routing_order": 1, "status": "declined", "declined_at": _days_ago(13), "decline_reason": "Need legal review before proceeding"},
            ],
            "audit_events": [
                {"event_type": "envelope_sent", "details": {}},
                {"event_type": "recipient_declined", "details": {"reason": "Need legal review before proceeding"}},
            ],
        },
        # Voided
        {
            "user_id": alice_id,
            "subject": "Partnership Agreement - Outdated Version",
            "message": "Please sign the partnership agreement.",
            "status": "voided",
            "sent_at": _days_ago(20),
            "created_at": _days_ago(22),
            "recipients": [
                {"name": "Noah Martin", "email": "noah.martin@logistics.co", "role": "signer", "routing_order": 1},
            ],
            "audit_events": [
                {"event_type": "envelope_sent", "details": {}},
                {"event_type": "envelope_voided", "details": {"reason": "Superseded by updated terms"}},
            ],
        },
        # Bob's envelopes
        {
            "user_id": bob_id,
            "subject": "Budget Approval - Q1 2026",
            "message": "Please approve the Q1 2026 budget allocation.",
            "status": "sent",
            "sent_at": _days_ago(2),
            "created_at": _days_ago(3),
            "recipients": [
                {"name": "Victor Allen", "email": "victor.allen@banking.com", "role": "approver", "routing_order": 1},
                {"name": "Rachel Clark", "email": "rachel.clark@nonprofit.org", "role": "signer", "routing_order": 2},
            ],
            "audit_events": [
                {"event_type": "envelope_sent", "details": {}},
            ],
        },
        {
            "user_id": bob_id,
            "subject": "Supplier Contract - ManuCo",
            "message": "Annual supplier agreement.",
            "status": "completed",
            "sent_at": _days_ago(20),
            "completed_at": _days_ago(18),
            "created_at": _days_ago(21),
            "recipients": [
                {"name": "Sam Rodriguez", "email": "sam.r@manufacturing.com", "role": "signer", "routing_order": 1, "status": "signed", "signed_at": _days_ago(18)},
            ],
            "audit_events": [
                {"event_type": "envelope_sent", "details": {}},
                {"event_type": "recipient_signed", "details": {"recipient_email": "sam.r@manufacturing.com"}},
                {"event_type": "envelope_completed", "details": {}},
            ],
        },
    ]
