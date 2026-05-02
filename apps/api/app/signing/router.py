import base64
import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response as FastAPIResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.envelopes.schemas import FieldResponse, RecipientResponse
from app.signing import service as svc
from app.signing.pdf_processor import render_page

UPLOADS_DIR = os.environ.get("UPLOADS_DIR", "/app/uploads")

router = APIRouter(prefix="/signing", tags=["signing"])


class FieldValueSubmit(BaseModel):
    value: str


class DeclineRequest(BaseModel):
    reason: Optional[str] = None


class AttachmentUpload(BaseModel):
    field_id: str
    filename: str
    data: str  # base64-encoded file contents


class AttachmentResponse(BaseModel):
    field_id: str
    filename: str
    stored_path: str


# Nested models matching the frontend's Envelope / SigningSession shape
class SigningRecipientInfo(BaseModel):
    id: str
    name: str
    email: str
    role: str
    routing_order: int
    status: str


class SigningDocumentInfo(BaseModel):
    id: str
    name: str
    original_filename: str
    filename: str
    pageCount: int
    page_count: int


class SigningEnvelopeInfo(BaseModel):
    id: str
    subject: str
    status: str
    # from / fromEmail are not stored; the backend user lookup is expensive
    # here – set to empty strings and let the frontend fall back gracefully.
    from_name: str = ""
    fromEmail: str = ""
    recipients: List[SigningRecipientInfo]
    documents: List[SigningDocumentInfo]
    message: Optional[str] = None


class SigningSessionResponse(BaseModel):
    # Full envelope object for the frontend SigningCeremony component
    envelope: SigningEnvelopeInfo
    recipientId: str
    recipientName: str
    recipientEmail: str
    # ALL fields for the envelope so other-recipient fields can be greyed out
    fields: List[FieldResponse]
    documents: List[SigningDocumentInfo]
    requiresAccessCode: bool = False


class CompleteSigningResponse(BaseModel):
    success: bool
    downloadUrl: Optional[str] = None


class VerifyAccessCodeRequest(BaseModel):
    code: str


class CompleteSigningRequest(BaseModel):
    """Optional payload for complete_signing.
    If the recipient has an access_code, the caller must supply it here so
    the backend can verify it independently of the frontend gate.
    """
    code: Optional[str] = None


# ── Static-prefix routes MUST be declared before wildcard /{token} routes ─────
# FastAPI matches in registration order; /documents/... would otherwise be
# captured by /{token} and fail with a 404 or database error.

@router.get("/documents/{document_id}/pages/{page}")
async def get_signing_document_page(
    document_id: uuid.UUID,
    page: int,
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Render a PDF page for an external signer (no auth required).

    The signing token is passed as a query parameter so we can verify the
    caller is an active recipient for the envelope that owns this document,
    without requiring a full user session.
    """
    doc = await svc.get_document_for_signing(db, token, document_id)
    try:
        png_bytes = render_page(doc.file_path, page - 1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to render page: {exc}",
        )
    return FastAPIResponse(content=png_bytes, media_type="image/png")


# ── Wildcard token routes ──────────────────────────────────────────────────────

@router.get("/{token}", response_model=SigningSessionResponse)
async def get_signing_session(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    session = await svc.get_signing_session(db, token)
    envelope = session["envelope"]
    recipient = session["recipient"]
    documents = session["documents"]
    fields = session["fields"]

    signing_documents = [
        SigningDocumentInfo(
            id=str(doc.id),
            name=doc.original_filename,
            original_filename=doc.original_filename,
            filename=doc.filename,
            pageCount=doc.page_count,
            page_count=doc.page_count,
        )
        for doc in documents
    ]

    signing_recipients = [
        SigningRecipientInfo(
            id=str(r.id),
            name=r.name,
            email=r.email,
            role=r.role.value,
            routing_order=r.routing_order,
            status=r.status.value,
        )
        for r in envelope.recipients
    ]

    envelope_info = SigningEnvelopeInfo(
        id=str(envelope.id),
        subject=envelope.subject,
        status=envelope.status.value,
        recipients=signing_recipients,
        documents=signing_documents,
        message=envelope.message,
    )

    return SigningSessionResponse(
        envelope=envelope_info,
        recipientId=str(recipient.id),
        recipientName=recipient.name,
        recipientEmail=recipient.email,
        fields=[FieldResponse.model_validate(f) for f in fields],
        documents=signing_documents,
        requiresAccessCode=bool(recipient.access_code),
    )


@router.post("/{token}/fields/{field_id}", response_model=FieldResponse)
async def submit_field_value(
    token: str,
    field_id: uuid.UUID,
    data: FieldValueSubmit,
    db: AsyncSession = Depends(get_db),
):
    field = await svc.submit_field(db, token, field_id, data.value)
    return field


@router.post("/{token}/attachment", response_model=AttachmentResponse)
async def upload_signing_attachment(
    token: str,
    data: AttachmentUpload,
    db: AsyncSession = Depends(get_db),
):
    """Stub endpoint: accept a base64-encoded file upload linked to a field.

    The file is stored under UPLOADS_DIR/attachments/{token}/{field_id}/{filename}.
    No real validation is done — this is a P1 stub.
    """
    # Verify the token is valid (will raise 404 if not)
    await svc.get_signing_session(db, token)

    # Decode and persist
    try:
        file_bytes = base64.b64decode(data.data)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid base64 data")

    safe_filename = os.path.basename(data.filename) or "attachment"
    dest_dir = os.path.join(UPLOADS_DIR, "attachments", token, data.field_id)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, safe_filename)
    with open(dest_path, "wb") as f:
        f.write(file_bytes)

    return AttachmentResponse(
        field_id=data.field_id,
        filename=safe_filename,
        stored_path=dest_path,
    )


@router.post("/{token}/verify-code")
async def verify_access_code(
    token: str,
    data: VerifyAccessCodeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify the access code for a recipient before allowing signing."""
    from sqlalchemy import select as sa_select
    from app.envelopes.models import Recipient

    result = await db.execute(sa_select(Recipient).where(Recipient.signing_token == token))
    recipient = result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signing session not found")
    if not recipient.access_code:
        return {"verified": True}
    if recipient.access_code != data.code.strip():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid access code")
    return {"verified": True}


@router.post("/{token}/complete", response_model=CompleteSigningResponse)
async def complete_signing(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    data: CompleteSigningRequest = CompleteSigningRequest(),
):
    """Complete the signing ceremony for a recipient.

    If the recipient has an access_code set, the caller must supply the matching
    code in the request body ({"code": "..."}).  This ensures the access-code
    gate is enforced at the API level and cannot be bypassed by calling the
    endpoint directly without going through the frontend UI.
    """
    from sqlalchemy import select as sa_select
    from app.envelopes.models import Recipient

    # Verify access code before proceeding
    rec_result = await db.execute(sa_select(Recipient).where(Recipient.signing_token == token))
    recipient_check = rec_result.scalar_one_or_none()
    if recipient_check and recipient_check.access_code:
        supplied = (data.code or "").strip()
        if not supplied:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access code required to complete signing",
            )
        if recipient_check.access_code != supplied:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid access code",
            )

    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    await svc.complete_signing(db, token, ip_address, user_agent)
    # The frontend expects { success, downloadUrl }. We return success=True and
    # no downloadUrl (the envelope download requires auth and is accessed through
    # the dashboard, not the signing page directly).
    return CompleteSigningResponse(success=True, downloadUrl=None)


@router.post("/{token}/decline", response_model=RecipientResponse)
async def decline_signing(
    token: str,
    data: DeclineRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    recipient = await svc.decline_signing(db, token, data.reason, ip_address, user_agent)
    return {
        "id": recipient.id,
        "envelope_id": recipient.envelope_id,
        "name": recipient.name,
        "email": recipient.email,
        "role": recipient.role,
        "routing_order": recipient.routing_order,
        "status": recipient.status,
        "signing_token": recipient.signing_token,
        "signed_at": recipient.signed_at,
        "declined_at": recipient.declined_at,
        "decline_reason": recipient.decline_reason,
        "fields": [],
    }
