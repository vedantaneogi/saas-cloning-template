"""
Real email delivery via Resend API.
Sends actual emails to recipients when RESEND_API_KEY is configured.
Internal DB delivery still happens for instant UI updates.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_resend_configured = False

try:
    import resend
    _resend_available = True
except ImportError:
    _resend_available = False
    logger.info("Resend package not installed — email delivery disabled")


def configure_resend(api_key: str) -> bool:
    """Initialize Resend with the API key. Returns True if configured."""
    global _resend_configured
    if not _resend_available or not api_key:
        return False
    resend.api_key = api_key
    _resend_configured = True
    logger.info("Resend email delivery configured")
    return True


async def send_email(
    from_name: str,
    from_email: str,
    to_addresses: list[dict],
    cc_addresses: list[dict] | None = None,
    bcc_addresses: list[dict] | None = None,
    subject: str = "",
    body_html: str = "",
    reply_to: str | None = None,
    from_domain: str = "resend.dev",
) -> Optional[dict]:
    """
    Send a real email via Resend.
    Returns the Resend response dict or None if not configured/failed.

    Note: Resend requires the "from" address to use a verified domain.
    Free tier can only send from onboarding@resend.dev.
    """
    if not _resend_configured:
        return None

    to_list = [a.get("email", "") for a in (to_addresses or []) if a.get("email")]
    cc_list = [a.get("email", "") for a in (cc_addresses or []) if a.get("email")]
    bcc_list = [a.get("email", "") for a in (bcc_addresses or []) if a.get("email")]

    if not to_list:
        return None

    # Use verified domain for "from" — fall back to onboarding@resend.dev for free tier
    from_addr = f"{from_name} <{from_email}>" if from_domain in from_email else f"{from_name} <onboarding@{from_domain}>"

    try:
        params: resend.Emails.SendParams = {
            "from": from_addr,
            "to": to_list,
            "subject": subject or "(no subject)",
            "html": body_html or "<p></p>",
        }

        if cc_list:
            params["cc"] = cc_list
        if bcc_list:
            params["bcc"] = bcc_list
        if reply_to:
            params["reply_to"] = reply_to

        result = resend.Emails.send(params)
        logger.info(f"Email sent via Resend: to={to_list}, subject={subject[:50]}, id={result.get('id', '?')}")
        return result

    except Exception as e:
        logger.error(f"Resend email failed: {e}")
        return None