import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.templates.models import Template
from app.templates.schemas import TemplateCreate, TemplateUpdate

logger = logging.getLogger(__name__)


async def create_template(
    db: AsyncSession, user_id: int, data: TemplateCreate
) -> Template:
    template = Template(
        user_id=user_id,
        name=data.name,
        description=data.description,
        fields_config=data.fields_config or [],
        roles=data.roles or [],
        document_ids=data.document_ids or [],
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


async def list_templates(
    db: AsyncSession,
    user_id: int,
    filter: str | None = None,
    search: str | None = None,
    page: int = 1,
    per_page: int = 25,
) -> list[Template]:
    query = select(Template).where(Template.user_id == user_id)

    if filter == "favorites":
        query = query.where(Template.is_favorite == True)  # noqa: E712
    elif filter == "shared":
        # No sharing model exists — shared-with-me is always empty
        return []
    # filter == "my-templates" or None → return all user's own templates (default behavior)

    if search:
        query = query.where(Template.name.ilike(f"%{search}%"))

    query = query.order_by(Template.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    return result.scalars().all()


async def list_templates_paginated(
    db: AsyncSession,
    user_id: int,
    filter: str | None = None,
    search: str | None = None,
    page: int = 1,
    per_page: int = 25,
) -> tuple[list[Template], int]:
    from sqlalchemy import func as sqlfunc

    # Build base where clauses (for both count and data)
    base_where = [Template.user_id == user_id]
    if filter == "favorites":
        base_where.append(Template.is_favorite == True)  # noqa: E712
    elif filter == "shared":
        return [], 0
    # filter == "my-templates" or None → return all user's own templates (default behavior)
    if search:
        base_where.append(Template.name.ilike(f"%{search}%"))

    # Count
    count_result = await db.execute(
        select(sqlfunc.count()).select_from(Template).where(*base_where)
    )
    total = count_result.scalar_one()

    # Data
    data_result = await db.execute(
        select(Template)
        .where(*base_where)
        .order_by(Template.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = data_result.scalars().all()

    return list(items), total


async def create_envelope_from_template(
    db: AsyncSession, template: Template, user_id: int
) -> uuid.UUID:
    import os
    import shutil
    from sqlalchemy import select as _select
    from app.envelopes.models import (
        Document, Envelope, EnvelopeStatus, Field, FieldType, Recipient, RecipientRole,
    )
    from app.core.config import get_settings
    settings = get_settings()

    # 1. Create envelope
    envelope = Envelope(
        user_id=user_id,
        subject=template.name,
        message=template.description or "",
        status=EnvelopeStatus.draft,
    )
    db.add(envelope)
    await db.flush()

    # 2. Copy source documents; build old_doc_id -> new Document map
    doc_id_map: dict[str, Document] = {}
    for old_doc_id_str in (template.document_ids or []):
        result = await db.execute(
            _select(Document).where(Document.id == uuid.UUID(old_doc_id_str))
        )
        orig = result.scalar_one_or_none()
        if not orig:
            continue
        ext = os.path.splitext(orig.filename)[1]
        new_file_id = str(uuid.uuid4())
        new_filename = f"{new_file_id}{ext}"
        new_path = os.path.join(settings.upload_dir, new_filename)
        if not os.path.exists(orig.file_path):
            raise ValueError(f"Template document file not found: {orig.original_filename}")
        try:
            shutil.copy2(orig.file_path, new_path)
        except Exception:
            continue

        # Copy preview PDF if one exists (generated for .docx/.doc uploads)
        new_preview_filename: str | None = None
        if orig.preview_filename:
            orig_preview_path = os.path.join(settings.upload_dir, orig.preview_filename)
            if os.path.exists(orig_preview_path):
                new_preview_filename = f"{new_file_id}_preview.pdf"
                new_preview_path = os.path.join(settings.upload_dir, new_preview_filename)
                try:
                    shutil.copy2(orig_preview_path, new_preview_path)
                except Exception:
                    new_preview_filename = None

        new_doc = Document(
            envelope_id=envelope.id,
            filename=new_filename,
            original_filename=orig.original_filename,
            file_path=new_path,
            preview_filename=new_preview_filename,
            page_count=orig.page_count,
            file_size=orig.file_size,
            order=orig.order,
        )
        db.add(new_doc)
        await db.flush()
        doc_id_map[old_doc_id_str] = new_doc

    # 3. Create recipients from roles; build old_recipient_id -> new Recipient map
    recipient_id_map: dict[str, Recipient] = {}
    for role_data in (template.roles or []):
        try:
            role_val = RecipientRole(role_data.get("role", "signer"))
        except ValueError:
            role_val = RecipientRole.signer
        recip = Recipient(
            envelope_id=envelope.id,
            name=role_data.get("name", ""),
            email=role_data.get("email", ""),
            role=role_val,
            routing_order=role_data.get("routing_order", 1),
            access_code=role_data.get("access_code"),
            template_role_label=role_data.get("role_label"),
        )
        db.add(recip)
        await db.flush()
        old_rid = role_data.get("recipient_id")
        if old_rid:
            recipient_id_map[old_rid] = recip

    # 4. Recreate fields using the remapped doc/recipient IDs
    # Two passes: first create all fields to build field_id_map, then set conditional_on
    field_id_map: dict[str, str] = {}
    new_fields: list[tuple[Field, dict]] = []
    for fc in (template.fields_config or []):
        new_doc = doc_id_map.get(fc.get("document_id", ""))
        new_rec = recipient_id_map.get(fc.get("recipient_id", ""))
        if not new_doc or not new_rec:
            logger.warning(
                "Template field dropped during envelope creation: "
                "document_id=%r (mapped=%s) recipient_id=%r (mapped=%s) type=%r",
                fc.get("document_id"), new_doc is not None,
                fc.get("recipient_id"), new_rec is not None,
                fc.get("type"),
            )
            continue
        try:
            ftype = FieldType(fc.get("type"))
        except ValueError:
            continue
        new_field = Field(
            document_id=new_doc.id,
            recipient_id=new_rec.id,
            type=ftype,
            page=fc.get("page", 1),
            x=float(fc.get("x", 0.0)),
            y=float(fc.get("y", 0.0)),
            width=float(fc.get("width", 100.0)),
            height=float(fc.get("height", 40.0)),
            required=bool(fc.get("required", True)),
            label=fc.get("label"),
            formula=fc.get("formula"),
            decimal_places=fc.get("decimal_places"),
            conditional_value=fc.get("conditional_value"),
            conditional_action=fc.get("conditional_action"),
        )
        db.add(new_field)
        await db.flush()
        old_field_id = fc.get("field_id")
        if old_field_id:
            field_id_map[old_field_id] = str(new_field.id)
        new_fields.append((new_field, fc))

    # Second pass: remap conditional_on field IDs
    for new_field, fc in new_fields:
        old_cond_on = fc.get("conditional_on")
        if old_cond_on and old_cond_on in field_id_map:
            new_field.conditional_on = field_id_map[old_cond_on]

    await db.commit()
    await db.refresh(envelope)
    return envelope.id


async def get_template(
    db: AsyncSession, template_id: uuid.UUID, user_id: int
) -> Template | None:
    result = await db.execute(
        select(Template).where(Template.id == template_id, Template.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def update_template(
    db: AsyncSession, template: Template, data: TemplateUpdate
) -> Template:
    for attr, value in data.model_dump(exclude_none=True).items():
        setattr(template, attr, value)
    await db.commit()
    await db.refresh(template)
    return template


async def delete_template(db: AsyncSession, template: Template) -> None:
    await db.delete(template)
    await db.commit()
