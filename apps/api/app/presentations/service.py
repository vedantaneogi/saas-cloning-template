from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.presentations.models import (
    Deck,
    PresentationCollaborator,
    PresentationVersion,
)

AUTO_VERSION_THROTTLE = timedelta(seconds=30)


def _blank_content(deck_id: str, title: str) -> dict[str, Any]:
    """Mirror of createMockDeck in apps/web/src/features/editor/model/mockDeck.ts.

    The editor hydrates the Y.Doc from this shape on first load.
    """
    return {
        "id": deck_id,
        "meta": {
            "title": title,
            "themeId": "default",
            "pageWidth": 960,
            "pageHeight": 540,
            "schemaVersion": 1,
        },
        "slides": [
            {
                "id": "slide-1",
                "layoutId": "title",
                "background": {"kind": "theme"},
                "elements": [
                    {
                        "id": "el-title",
                        "type": "text",
                        "x": 80,
                        "y": 170,
                        "w": 800,
                        "h": 130,
                        "z": 1,
                        "text": {
                            "align": "center",
                            "fontSize": 48,
                            "placeholder": "Click to add title",
                        },
                    },
                    {
                        "id": "el-subtitle",
                        "type": "text",
                        "x": 80,
                        "y": 330,
                        "w": 800,
                        "h": 60,
                        "z": 2,
                        "text": {
                            "align": "center",
                            "fontSize": 22,
                            "color": "#5f6368",
                            "placeholder": "Click to add subtitle",
                        },
                    },
                ],
            }
        ],
    }


async def create_deck(db: AsyncSession, owner_id: int, title: str) -> Deck:
    deck = Deck(owner_id=owner_id, title=title, content={})
    db.add(deck)
    await db.flush()
    deck.content = _blank_content(str(deck.id), title)
    await db.commit()
    await db.refresh(deck)
    return deck


async def list_decks(db: AsyncSession, owner_id: int) -> list[Deck]:
    result = await db.execute(
        select(Deck)
        .where(Deck.owner_id == owner_id)
        .order_by(Deck.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_deck(
    db: AsyncSession, deck_id: UUID, owner_id: int
) -> Deck | None:
    """Strict owner-only fetch. Used by mutating endpoints."""
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.owner_id == owner_id)
    )
    return result.scalar_one_or_none()


async def get_deck_for_viewer(
    db: AsyncSession, deck_id: UUID, user_id: int, user_email: str
) -> Deck | None:
    """Read access: owner OR invited collaborator (by email)."""
    email = user_email.strip().lower()
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id)
    )
    deck = result.scalar_one_or_none()
    if deck is None:
        return None
    if deck.owner_id == user_id:
        return deck
    collab = await db.execute(
        select(PresentationCollaborator.id).where(
            PresentationCollaborator.presentation_id == deck_id,
            func.lower(PresentationCollaborator.collaborator_email) == email,
        )
    )
    if collab.scalar_one_or_none() is not None:
        return deck
    return None


async def get_deck_public(db: AsyncSession, deck_id: UUID) -> Deck | None:
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.is_public.is_(True))
    )
    return result.scalar_one_or_none()


async def list_collaborators(
    db: AsyncSession, deck_id: UUID
) -> list[PresentationCollaborator]:
    result = await db.execute(
        select(PresentationCollaborator)
        .where(PresentationCollaborator.presentation_id == deck_id)
        .order_by(PresentationCollaborator.created_at.asc())
    )
    return list(result.scalars().all())


async def add_collaborator(
    db: AsyncSession,
    deck_id: UUID,
    email: str,
    role: str = "viewer",
) -> PresentationCollaborator | None:
    normalized = email.strip().lower()
    if not normalized:
        return None
    stmt = (
        pg_insert(PresentationCollaborator)
        .values(
            presentation_id=deck_id,
            collaborator_email=normalized,
            role=role,
        )
        .on_conflict_do_update(
            constraint="uq_presentation_collaborator_email",
            set_={"role": role},
        )
        .returning(PresentationCollaborator)
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    await db.commit()
    return row


async def remove_collaborator(
    db: AsyncSession, deck_id: UUID, email: str
) -> bool:
    normalized = email.strip().lower()
    result = await db.execute(
        delete(PresentationCollaborator).where(
            PresentationCollaborator.presentation_id == deck_id,
            func.lower(PresentationCollaborator.collaborator_email) == normalized,
        )
    )
    await db.commit()
    return (result.rowcount or 0) > 0


async def _next_version_number(db: AsyncSession, deck_id: UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.max(PresentationVersion.version_number), 0)).where(
            PresentationVersion.presentation_id == deck_id
        )
    )
    current = result.scalar_one() or 0
    return int(current) + 1


async def _latest_version(
    db: AsyncSession, deck_id: UUID
) -> PresentationVersion | None:
    result = await db.execute(
        select(PresentationVersion)
        .where(PresentationVersion.presentation_id == deck_id)
        .order_by(PresentationVersion.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def create_version(
    db: AsyncSession,
    deck_id: UUID,
    author_id: int,
    content: dict[str, Any],
    label: str | None = None,
    commit: bool = True,
) -> PresentationVersion:
    version_number = await _next_version_number(db, deck_id)
    version = PresentationVersion(
        presentation_id=deck_id,
        author_id=author_id,
        version_number=version_number,
        label=label,
        content=content,
    )
    db.add(version)
    if commit:
        await db.commit()
        await db.refresh(version)
    else:
        await db.flush()
    return version


async def maybe_create_auto_version(
    db: AsyncSession,
    deck_id: UUID,
    author_id: int,
    content: dict[str, Any],
) -> PresentationVersion | None:
    """Create an auto-snapshot if the latest version is older than the throttle
    window or no versions exist yet."""
    latest = await _latest_version(db, deck_id)
    now = datetime.now(timezone.utc)
    if latest is not None:
        last_ts = latest.created_at
        if last_ts.tzinfo is None:
            last_ts = last_ts.replace(tzinfo=timezone.utc)
        if now - last_ts < AUTO_VERSION_THROTTLE:
            return None
    return await create_version(
        db, deck_id, author_id, content, label=None, commit=False
    )


async def list_versions(
    db: AsyncSession, deck_id: UUID
) -> list[tuple[PresentationVersion, str | None]]:
    result = await db.execute(
        select(PresentationVersion, User.name)
        .join(User, User.id == PresentationVersion.author_id, isouter=True)
        .where(PresentationVersion.presentation_id == deck_id)
        .order_by(PresentationVersion.created_at.desc())
    )
    return [(row[0], row[1]) for row in result.all()]


async def get_version(
    db: AsyncSession, version_id: UUID, deck_id: UUID
) -> PresentationVersion | None:
    result = await db.execute(
        select(PresentationVersion).where(
            PresentationVersion.id == version_id,
            PresentationVersion.presentation_id == deck_id,
        )
    )
    return result.scalar_one_or_none()


async def get_version_with_author(
    db: AsyncSession, version_id: UUID, deck_id: UUID
) -> tuple[PresentationVersion, str | None] | None:
    result = await db.execute(
        select(PresentationVersion, User.name)
        .join(User, User.id == PresentationVersion.author_id, isouter=True)
        .where(
            PresentationVersion.id == version_id,
            PresentationVersion.presentation_id == deck_id,
        )
    )
    row = result.one_or_none()
    if row is None:
        return None
    return (row[0], row[1])


async def name_version(
    db: AsyncSession,
    version_id: UUID,
    deck_id: UUID,
    label: str,
) -> PresentationVersion | None:
    version = await get_version(db, version_id, deck_id)
    if version is None:
        return None
    version.label = label
    await db.commit()
    await db.refresh(version)
    return version


async def restore_version(
    db: AsyncSession,
    version_id: UUID,
    deck_id: UUID,
    owner_id: int,
) -> Deck | None:
    deck = await get_deck(db, deck_id, owner_id)
    if deck is None:
        return None
    version = await get_version(db, version_id, deck_id)
    if version is None:
        return None
    restored_content = dict(version.content or {})
    # Keep the deck's current title so restoration doesn't rename the deck;
    # keep the content.meta.title in sync with deck.title.
    meta = dict(restored_content.get("meta") or {})
    meta["title"] = deck.title
    restored_content["meta"] = meta
    deck.content = restored_content
    restore_label_source = (
        version.label if version.label else f"version {version.version_number}"
    )
    # Snapshot the restored state so the restore itself is an auditable entry.
    await create_version(
        db,
        deck_id,
        owner_id,
        restored_content,
        label=f"Restored from {restore_label_source}",
        commit=False,
    )
    await db.commit()
    await db.refresh(deck)
    return deck


async def update_deck_content(
    db: AsyncSession,
    deck_id: UUID,
    owner_id: int,
    content: dict[str, Any],
    title: str,
) -> Deck | None:
    deck = await get_deck(db, deck_id, owner_id)
    if deck is None:
        return None
    deck.content = content
    deck.title = title
    await maybe_create_auto_version(db, deck_id, owner_id, content)
    await db.commit()
    await db.refresh(deck)
    return deck


async def rename_deck(
    db: AsyncSession, deck_id: UUID, owner_id: int, title: str
) -> Deck | None:
    deck = await get_deck(db, deck_id, owner_id)
    if deck is None:
        return None
    deck.title = title
    # Keep content.meta.title in sync so the hydrated editor shows the new title.
    content = dict(deck.content or {})
    meta = dict(content.get("meta") or {})
    meta["title"] = title
    content["meta"] = meta
    deck.content = content
    await db.commit()
    await db.refresh(deck)
    return deck


async def set_deck_public(
    db: AsyncSession, deck_id: UUID, owner_id: int, is_public: bool
) -> Deck | None:
    deck = await get_deck(db, deck_id, owner_id)
    if deck is None:
        return None
    deck.is_public = is_public
    await db.commit()
    await db.refresh(deck)
    return deck


async def delete_deck(
    db: AsyncSession, deck_id: UUID, owner_id: int
) -> bool:
    result = await db.execute(
        delete(Deck).where(Deck.id == deck_id, Deck.owner_id == owner_id)
    )
    await db.commit()
    return (result.rowcount or 0) > 0
