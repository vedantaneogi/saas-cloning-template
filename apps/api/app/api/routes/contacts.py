import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.contact import Contact
from app.models.user import User
from app.rl.state import rl_state
from app.schemas.contact import ContactCreate, ContactOut, ContactUpdate

router = APIRouter(prefix="/contacts", tags=["Contacts"])


class ContactList:
    pass


from pydantic import BaseModel


class ContactListOut(BaseModel):
    items: list[ContactOut]
    next_cursor: Optional[str] = None
    total_count: int


async def _get_contact_or_404(db: AsyncSession, contact_id: uuid.UUID, user_id: uuid.UUID) -> Contact:
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == user_id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Contact not found"}},
        )
    return c


@router.get("/autocomplete", response_model=list[ContactOut])
async def autocomplete_contacts(
    q: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not q:
        return []
    term = f"%{q}%"
    result = await db.execute(
        select(Contact)
        .where(
            Contact.user_id == current_user.id,
            or_(
                Contact.display_name.ilike(term),
                Contact.email.ilike(term),
                Contact.first_name.ilike(term),
                Contact.last_name.ilike(term),
            ),
        )
        .limit(10)
    )
    return [ContactOut.model_validate(c) for c in result.scalars().all()]


@router.get("", response_model=ContactListOut)
async def list_contacts(
    search: Optional[str] = None,
    company: Optional[str] = None,
    is_favorite: Optional[bool] = None,
    sort: str = "display_name:asc",
    cursor: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = [Contact.user_id == current_user.id]
    if search:
        term = f"%{search}%"
        filters.append(
            or_(
                Contact.display_name.ilike(term),
                Contact.email.ilike(term),
                Contact.first_name.ilike(term),
                Contact.last_name.ilike(term),
            )
        )
    if company:
        filters.append(Contact.company.ilike(f"%{company}%"))
    if is_favorite is not None:
        filters.append(Contact.is_favorite == is_favorite)

    total_result = await db.execute(select(func.count()).select_from(Contact).where(*filters))
    total = total_result.scalar() or 0

    sort_field, sort_dir = (sort.split(":") + ["asc"])[:2]
    sort_col = getattr(Contact, sort_field, Contact.display_name)
    order = desc(sort_col) if sort_dir == "desc" else sort_col

    result = await db.execute(
        select(Contact).where(*filters).order_by(order).limit(limit + 1)
    )
    contacts = list(result.scalars().all())
    has_more = len(contacts) > limit
    items = contacts[:limit]
    next_cursor = str(items[-1].id) if has_more else None

    return ContactListOut(
        items=[ContactOut.model_validate(c) for c in items],
        next_cursor=next_cursor,
        total_count=total,
    )


@router.get("/{contact_id}", response_model=ContactOut)
async def get_contact(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ContactOut.model_validate(await _get_contact_or_404(db, contact_id, current_user.id))


@router.post("", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
async def create_contact(
    body: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = rl_state.clock.now()
    display_name = body.display_name or f"{body.first_name} {body.last_name or ''}".strip()
    contact = Contact(
        id=uuid.uuid4(),
        user_id=current_user.id,
        world_id=body.world_id,
        first_name=body.first_name,
        last_name=body.last_name,
        display_name=display_name,
        email=body.email,
        phone=body.phone,
        company=body.company,
        job_title=body.job_title,
        address=body.address,
        notes=body.notes,
        avatar_url=body.avatar_url,
        is_favorite=body.is_favorite,
        created_at=now,
        updated_at=now,
    )
    db.add(contact)
    await db.flush()
    rl_state.event_log.append("contact_created", {"id": str(contact.id)})
    return ContactOut.model_validate(contact)


@router.patch("/{contact_id}", response_model=ContactOut)
async def update_contact(
    contact_id: uuid.UUID,
    body: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = await _get_contact_or_404(db, contact_id, current_user.id)

    if body.first_name is not None:
        contact.first_name = body.first_name
    if body.last_name is not None:
        contact.last_name = body.last_name
    if body.display_name is not None:
        contact.display_name = body.display_name
    if body.email is not None:
        contact.email = body.email
    if body.phone is not None:
        contact.phone = body.phone
    if body.company is not None:
        contact.company = body.company
    if body.job_title is not None:
        contact.job_title = body.job_title
    if body.address is not None:
        contact.address = body.address
    if body.notes is not None:
        contact.notes = body.notes
    if body.avatar_url is not None:
        contact.avatar_url = body.avatar_url
    if body.is_favorite is not None:
        contact.is_favorite = body.is_favorite

    contact.updated_at = rl_state.clock.now()
    await db.flush()
    rl_state.event_log.append("contact_updated", {"id": str(contact.id)})
    return ContactOut.model_validate(contact)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = await _get_contact_or_404(db, contact_id, current_user.id)
    await db.delete(contact)
    await db.flush()
    rl_state.event_log.append("contact_deleted", {"id": str(contact_id)})
