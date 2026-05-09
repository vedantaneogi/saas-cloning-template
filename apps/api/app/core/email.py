import asyncio
import html
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def _signing_email_html(
    recipient_name: str,
    sender_name: str,
    sender_email: str,
    subject: str,
    message: Optional[str],
    signing_url: str,
    is_reminder: bool = False,
    private_message: Optional[str] = None,
) -> str:
    intro = "This is a reminder to review and sign" if is_reminder else "has requested your signature on"
    greeting = f"Dear {html.escape(recipient_name)}," if recipient_name else "Hello,"
    msg_block = (
        f'<p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6;">'
        f'<em>"{html.escape(message)}"</em></p>'
        if message
        else ""
    )
    private_msg_block = (
        f'<div style="margin:0 0 20px;padding:12px 16px;background:#f5f0ff;border-left:3px solid #4c00ff;border-radius:4px;">'
        f'<p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4c00ff;text-transform:uppercase;letter-spacing:0.5px;">Personal note from {html.escape(sender_name)}</p>'
        f'<p style="margin:0;color:#333;font-size:14px;line-height:1.5;">{html.escape(private_message)}</p>'
        f'</div>'
        if private_message
        else ""
    )
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#130032;padding:24px 32px;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="padding-right:10px;vertical-align:middle;">
                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj4KICA8cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSIzIiBmaWxsPSIjM0IxRkEzIi8+CiAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjI2IiBoZWlnaHQ9IjI2IiByeD0iMyIgZmlsbD0iI0U4MzQyQSIvPgo8L3N2Zz4=" alt="DocuSign Clone" width="28" height="28" style="display:block;" />
              </td>
              <td style="vertical-align:middle;">
                <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">DocuSign Clone</span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;color:#130032;font-size:15px;">{greeting}</p>
            <p style="margin:0 0 20px;color:#333;font-size:15px;line-height:1.6;">
              <strong>{html.escape(sender_name)}</strong> ({html.escape(sender_email)}) {intro}
              <strong>"{html.escape(subject)}"</strong>.
            </p>
            {msg_block}
            {private_msg_block}
            <p style="margin:0 0 28px;color:#555;font-size:14px;">
              Click the button below to review and sign the document.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#4c00ff;border-radius:6px;">
                  <a href="{signing_url}"
                     style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.1px;">
                    {"Review Reminder" if is_reminder else "Review Document"}
                  </a>
                </td>
              </tr>
            </table>

            <!-- Link fallback -->
            <p style="margin:24px 0 0;color:#888;font-size:12px;">
              Or copy this link into your browser:<br>
              <a href="{signing_url}" style="color:#4c00ff;word-break:break-all;">{signing_url}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #eee;">
            <p style="margin:0;color:#aaa;font-size:11px;">
              This is an automated message from DocuSign Clone. Do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def send_signing_invitation(
    recipient_email: str,
    recipient_name: str,
    sender_name: str,
    sender_email: str,
    envelope_subject: str,
    envelope_message: Optional[str],
    signing_token: str,
    is_reminder: bool = False,
    private_message: Optional[str] = None,
) -> None:
    from app.core.config import get_settings
    settings = get_settings()

    if not settings.resend_api_key:
        logger.warning(
            "RESEND_API_KEY not set — skipping email to %s (token: %s)",
            recipient_email,
            signing_token,
        )
        return

    signing_url = f"{settings.frontend_url}/sign/{signing_token}"
    email_subject = (
        f"Reminder: Please sign: {envelope_subject}"
        if is_reminder
        else f"Please sign: {envelope_subject}"
    )
    html = _signing_email_html(
        recipient_name=recipient_name,
        sender_name=sender_name,
        sender_email=sender_email,
        subject=envelope_subject,
        message=envelope_message,
        signing_url=signing_url,
        is_reminder=is_reminder,
        private_message=private_message,
    )

    import resend as _resend
    _resend.api_key = settings.resend_api_key

    params: _resend.Emails.SendParams = {
        "from": settings.email_from,
        "to": [recipient_email],
        "subject": email_subject,
        "html": html,
    }

    try:
        await asyncio.to_thread(_resend.Emails.send, params)
        logger.info("Email sent to %s for envelope '%s'", recipient_email, envelope_subject)
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", recipient_email, exc)


def _completion_email_html(
    owner_name: str,
    envelope_subject: str,
    download_url: str,
    is_cc: bool = False,
) -> str:
    greeting = f"Dear {html.escape(owner_name)}," if owner_name else "Hello,"
    if is_cc:
        body_text = "A document you were copied on has been completed. You can view it at the link below."
        cta_label = "View Signed Document"
    else:
        body_text = "All parties have signed. Your completed document is ready to download."
        cta_label = "Download Signed Document"
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#130032;padding:24px 32px;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="padding-right:10px;vertical-align:middle;">
                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj4KICA8cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSIzIiBmaWxsPSIjM0IxRkEzIi8+CiAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjI2IiBoZWlnaHQ9IjI2IiByeD0iMyIgZmlsbD0iI0U4MzQyQSIvPgo8L3N2Zz4=" alt="DocuSign Clone" width="28" height="28" style="display:block;" />
              </td>
              <td style="vertical-align:middle;">
                <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">DocuSign Clone</span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;color:#130032;font-size:15px;">{greeting}</p>
            <p style="margin:0 0 20px;color:#333;font-size:15px;line-height:1.6;">
              <strong>"{html.escape(envelope_subject)}"</strong> has been completed.
            </p>
            <p style="margin:0 0 28px;color:#555;font-size:14px;line-height:1.6;">
              {body_text}
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#4c00ff;border-radius:6px;">
                  <a href="{download_url}"
                     style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.1px;">
                    {cta_label}
                  </a>
                </td>
              </tr>
            </table>

            <!-- Link fallback -->
            <p style="margin:24px 0 0;color:#888;font-size:12px;">
              Or copy this link into your browser:<br>
              <a href="{download_url}" style="color:#4c00ff;word-break:break-all;">{download_url}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #eee;">
            <p style="margin:0;color:#aaa;font-size:11px;">
              This is an automated message from DocuSign Clone. Do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _declined_email_html(
    owner_name: str,
    envelope_subject: str,
    decliner_name: str,
    decliner_email: str,
    reason: Optional[str],
) -> str:
    greeting = f"Dear {html.escape(owner_name)}," if owner_name else "Hello,"
    reason_text = reason or "No reason provided"
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#130032;padding:24px 32px;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="padding-right:10px;vertical-align:middle;">
                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj4KICA8cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSIzIiBmaWxsPSIjM0IxRkEzIi8+CiAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjI2IiBoZWlnaHQ9IjI2IiByeD0iMyIgZmlsbD0iI0U4MzQyQSIvPgo8L3N2Zz4=" alt="DocuSign Clone" width="28" height="28" style="display:block;" />
              </td>
              <td style="vertical-align:middle;">
                <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">DocuSign Clone</span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;color:#130032;font-size:15px;">{greeting}</p>
            <p style="margin:0 0 20px;color:#333;font-size:15px;line-height:1.6;">
              The envelope <strong>"{html.escape(envelope_subject)}"</strong> has been declined.
            </p>
            <p style="margin:0 0 8px;color:#555;font-size:14px;line-height:1.6;">
              <strong>Declined by:</strong> {html.escape(decliner_name)} ({html.escape(decliner_email)})
            </p>
            <p style="margin:0 0 28px;color:#555;font-size:14px;line-height:1.6;">
              <strong>Reason:</strong> {html.escape(reason_text)}
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #eee;">
            <p style="margin:0;color:#aaa;font-size:11px;">
              This is an automated message from DocuSign Clone. Do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _cc_email_html(
    cc_name: str,
    sender_name: str,
    sender_email: str,
    envelope_subject: str,
    envelope_message: Optional[str],
    view_url: str,
) -> str:
    greeting = f"Dear {html.escape(cc_name)}," if cc_name else "Hello,"
    msg_block = (
        f'<p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6;">'
        f'<em>"{html.escape(envelope_message)}"</em></p>'
        if envelope_message
        else ""
    )
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#130032;padding:24px 32px;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="padding-right:10px;vertical-align:middle;">
                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj4KICA8cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSIzIiBmaWxsPSIjM0IxRkEzIi8+CiAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjI2IiBoZWlnaHQ9IjI2IiByeD0iMyIgZmlsbD0iI0U4MzQyQSIvPgo8L3N2Zz4=" alt="DocuSign Clone" width="28" height="28" style="display:block;" />
              </td>
              <td style="vertical-align:middle;">
                <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">DocuSign Clone</span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;color:#130032;font-size:15px;">{greeting}</p>
            <p style="margin:0 0 20px;color:#333;font-size:15px;line-height:1.6;">
              <strong>{html.escape(sender_name)}</strong> ({html.escape(sender_email)}) has sent an agreement and copied you.
            </p>
            <p style="margin:0 0 20px;color:#333;font-size:15px;line-height:1.6;">
              Document: <strong>"{html.escape(envelope_subject)}"</strong>
            </p>
            {msg_block}
            <p style="margin:0 0 28px;color:#555;font-size:14px;">
              You can view it at the link below.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#4c00ff;border-radius:6px;">
                  <a href="{view_url}"
                     style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.1px;">
                    View Document
                  </a>
                </td>
              </tr>
            </table>

            <!-- Link fallback -->
            <p style="margin:24px 0 0;color:#888;font-size:12px;">
              Or copy this link into your browser:<br>
              <a href="{view_url}" style="color:#4c00ff;word-break:break-all;">{view_url}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #eee;">
            <p style="margin:0;color:#aaa;font-size:11px;">
              This is an automated message from DocuSign Clone. Do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def send_completion_notification(
    owner_email: str,
    owner_name: str,
    envelope_subject: str,
    envelope_id: str,
    is_cc: bool = False,
) -> None:
    from app.core.config import get_settings
    settings = get_settings()

    if not settings.resend_api_key:
        logger.warning(
            "RESEND_API_KEY not set — skipping completion email to %s (envelope: %s)",
            owner_email,
            envelope_id,
        )
        return

    download_url = f"{settings.frontend_url}/agreements/{envelope_id}"
    html = _completion_email_html(
        owner_name=owner_name,
        envelope_subject=envelope_subject,
        download_url=download_url,
        is_cc=is_cc,
    )

    import resend as _resend
    _resend.api_key = settings.resend_api_key

    params: _resend.Emails.SendParams = {
        "from": settings.email_from,
        "to": [owner_email],
        "subject": f"Completed: {envelope_subject}",
        "html": html,
    }

    try:
        await asyncio.to_thread(_resend.Emails.send, params)
        logger.info("Completion email sent to %s for envelope '%s'", owner_email, envelope_subject)
    except Exception as exc:
        logger.error("Failed to send completion email to %s: %s", owner_email, exc)


async def send_declined_notification(
    owner_email: str,
    owner_name: str,
    envelope_subject: str,
    decliner_name: str,
    decliner_email: str,
    reason: Optional[str],
) -> None:
    from app.core.config import get_settings
    settings = get_settings()

    if not settings.resend_api_key:
        logger.warning(
            "RESEND_API_KEY not set — skipping declined email to %s",
            owner_email,
        )
        return

    html = _declined_email_html(
        owner_name=owner_name,
        envelope_subject=envelope_subject,
        decliner_name=decliner_name,
        decliner_email=decliner_email,
        reason=reason,
    )

    import resend as _resend
    _resend.api_key = settings.resend_api_key

    params: _resend.Emails.SendParams = {
        "from": settings.email_from,
        "to": [owner_email],
        "subject": f"Declined: {envelope_subject}",
        "html": html,
    }

    try:
        await asyncio.to_thread(_resend.Emails.send, params)
        logger.info("Declined notification sent to %s for envelope '%s'", owner_email, envelope_subject)
    except Exception as exc:
        logger.error("Failed to send declined email to %s: %s", owner_email, exc)


async def send_voided_notification(
    owner_email: str,
    owner_name: str,
    envelope_subject: str,
    reason: str = "Voided by sender",
) -> None:
    from app.core.config import get_settings
    settings = get_settings()

    if not settings.resend_api_key:
        return

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1B0A3C; padding: 20px 30px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding-right:10px;vertical-align:middle;">
            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj4KICA8cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSIzIiBmaWxsPSIjM0IxRkEzIi8+CiAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjI2IiBoZWlnaHQ9IjI2IiByeD0iMyIgZmlsbD0iI0U4MzQyQSIvPgo8L3N2Zz4=" alt="DocuSign Clone" width="28" height="28" style="display:block;" />
          </td>
          <td style="vertical-align:middle;">
            <span style="color: white; font-size: 18px; font-weight: bold;">DocuSign Clone</span>
          </td>
        </tr></table>
      </div>
      <div style="padding: 30px;">
        <p>Dear {html.escape(owner_name) if owner_name else 'User'},</p>
        <p>The envelope <strong>"{html.escape(envelope_subject)}"</strong> has been voided.</p>
        <p><strong>Reason:</strong> {html.escape(reason)}</p>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">This is an automated message from DocuSign Clone. Do not reply to this email.</p>
      </div>
    </div>
    """

    import resend as _resend
    _resend.api_key = settings.resend_api_key

    params: _resend.Emails.SendParams = {
        "from": settings.email_from,
        "to": [owner_email],
        "subject": f"Voided: {envelope_subject}",
        "html": html,
    }

    try:
        await asyncio.to_thread(_resend.Emails.send, params)
        logger.info("Voided notification sent to %s for '%s'", owner_email, envelope_subject)
    except Exception as exc:
        logger.error("Failed to send voided email to %s: %s", owner_email, exc)


async def send_password_reset_email(email: str, name: str, reset_token: str) -> None:
    from app.core.config import get_settings
    settings = get_settings()

    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — skipping password reset email to %s", email)
        return

    reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"
    greeting = f"Dear {name}," if name else "Hello,"
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#130032;padding:24px 32px;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="padding-right:10px;vertical-align:middle;">
                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj4KICA8cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSIzIiBmaWxsPSIjM0IxRkEzIi8+CiAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjI2IiBoZWlnaHQ9IjI2IiByeD0iMyIgZmlsbD0iI0U4MzQyQSIvPgo8L3N2Zz4=" alt="DocuSign Clone" width="28" height="28" style="display:block;" />
              </td>
              <td style="vertical-align:middle;">
                <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">DocuSign Clone</span>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;color:#130032;font-size:15px;">{greeting}</p>
            <p style="margin:0 0 20px;color:#333;font-size:15px;line-height:1.6;">
              We received a request to reset your password. Click the button below to choose a new one.
            </p>
            <p style="margin:0 0 28px;color:#888;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#4c00ff;border-radius:6px;">
                  <a href="{reset_url}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#888;font-size:12px;">
              Or copy this link:<br>
              <a href="{reset_url}" style="color:#4c00ff;word-break:break-all;">{reset_url}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #eee;">
            <p style="margin:0;color:#aaa;font-size:11px;">This is an automated message from DocuSign Clone. Do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    import resend as _resend
    _resend.api_key = settings.resend_api_key
    params: _resend.Emails.SendParams = {
        "from": settings.email_from,
        "to": [email],
        "subject": "Reset your DocuSign Clone password",
        "html": html,
    }
    try:
        await asyncio.to_thread(_resend.Emails.send, params)
        logger.info("Password reset email sent to %s", email)
    except Exception as exc:
        logger.error("Failed to send password reset email to %s: %s", email, exc)


async def send_cc_notification(
    cc_email: str,
    cc_name: str,
    sender_name: str,
    sender_email: str,
    envelope_subject: str,
    envelope_message: Optional[str],
    signing_token: str,
) -> None:
    from app.core.config import get_settings
    settings = get_settings()

    if not settings.resend_api_key:
        logger.warning(
            "RESEND_API_KEY not set — skipping CC email to %s (token: %s)",
            cc_email,
            signing_token,
        )
        return

    view_url = f"{settings.frontend_url}/sign/{signing_token}"
    html = _cc_email_html(
        cc_name=cc_name,
        sender_name=sender_name,
        sender_email=sender_email,
        envelope_subject=envelope_subject,
        envelope_message=envelope_message,
        view_url=view_url,
    )

    import resend as _resend
    _resend.api_key = settings.resend_api_key

    params: _resend.Emails.SendParams = {
        "from": settings.email_from,
        "to": [cc_email],
        "subject": f"You've been copied: {envelope_subject}",
        "html": html,
    }

    try:
        await asyncio.to_thread(_resend.Emails.send, params)
        logger.info("CC notification sent to %s for envelope '%s'", cc_email, envelope_subject)
    except Exception as exc:
        logger.error("Failed to send CC email to %s: %s", cc_email, exc)
