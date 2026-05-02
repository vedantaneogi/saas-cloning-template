import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.templates.models import Template
from app.templates.schemas import TemplateCreate, TemplateUpdate


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
    from app.envelopes.models import Envelope, EnvelopeStatus

    envelope = Envelope(
        user_id=user_id,
        subject=template.name,
        message=template.description or "",
        status=EnvelopeStatus.draft,
    )
    db.add(envelope)
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
