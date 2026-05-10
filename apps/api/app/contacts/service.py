import uuid
from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contacts.models import Contact


async def create_contact(
    db: AsyncSession, user_id: int, name: str, email: str, company: Optional[str] = None
) -> Contact:
    contact = Contact(user_id=user_id, name=name, email=email, company=company)
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


async def list_contacts(
    db: AsyncSession, user_id: int, search: Optional[str] = None
) -> list[Contact]:
    query = select(Contact).where(Contact.user_id == user_id)
    if search:
        query = query.where(
            or_(
                Contact.name.ilike(f"%{search}%"),
                Contact.email.ilike(f"%{search}%"),
                Contact.company.ilike(f"%{search}%"),
            )
        )
    query = query.order_by(Contact.name.asc())
    result = await db.execute(query)
    return result.scalars().all()


async def get_contact(
    db: AsyncSession, contact_id: uuid.UUID, user_id: int
) -> Contact | None:
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def update_contact(
    db: AsyncSession,
    contact: Contact,
    name: Optional[str] = None,
    email: Optional[str] = None,
    company: Optional[str] = None,
) -> Contact:
    if name is not None:
        contact.name = name
    if email is not None:
        contact.email = email
    if company is not None:
        contact.company = company
    await db.commit()
    await db.refresh(contact)
    return contact


async def delete_contact(db: AsyncSession, contact: Contact) -> None:
    await db.delete(contact)
    await db.commit()
