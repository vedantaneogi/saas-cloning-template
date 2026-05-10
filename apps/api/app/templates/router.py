import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
from app.templates import service as svc
from app.templates.schemas import TemplateCreate, TemplateListResponse, TemplateResponse, TemplateUpdate

router = APIRouter(prefix="/templates", tags=["templates"])


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await svc.create_template(db, current_user.id, data)


@router.get("", response_model=TemplateListResponse)
async def list_templates(
    filter: Optional[str] = Query(None, description="Filter: 'favorites', 'my-templates', 'shared'"),
    search: Optional[str] = Query(None, description="Search by template name"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(25, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = await svc.list_templates_paginated(db, current_user.id, filter=filter, search=search, page=page, per_page=per_page)
    pages = max(1, -(-total // per_page))
    serialized = []
    for t in items:
        resp = TemplateResponse.model_validate(t)
        if hasattr(t, "owner") and t.owner:
            resp.owner_name = t.owner.name
        else:
            resp.owner_name = current_user.name
        serialized.append(resp)
    return TemplateListResponse(items=serialized, total=total, page=page, pages=pages, per_page=per_page)


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = await svc.get_template(db, template_id, current_user.id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return template


@router.post("/{template_id}/use", status_code=status.HTTP_201_CREATED)
async def use_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = await svc.get_template(db, template_id, current_user.id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    envelope_id = await svc.create_envelope_from_template(db, template, current_user.id)
    return {"envelopeId": str(envelope_id)}


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: uuid.UUID,
    data: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = await svc.get_template(db, template_id, current_user.id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return await svc.update_template(db, template, data)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = await svc.get_template(db, template_id, current_user.id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    await svc.delete_template(db, template)
