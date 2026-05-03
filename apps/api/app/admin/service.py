from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.seeds import (
    BOB_EMAIL,
    build_seed_decks,
    build_seed_users,
)
from app.auth.models import User
from app.presentations.models import (
    Deck,
    PresentationCollaborator,
    PresentationVersion,
)

CLEARED_TABLES: list[str] = [
    "presentation_versions",
    "presentation_collaborators",
    "decks",
    "users",
]


async def truncate_all(db: AsyncSession) -> list[str]:
    table_list = ", ".join(CLEARED_TABLES)
    await db.execute(text(f"TRUNCATE {table_list} RESTART IDENTITY CASCADE"))
    await db.commit()
    return list(CLEARED_TABLES)


async def seed_all(db: AsyncSession, *, reset: bool) -> dict[str, int]:
    if reset:
        await truncate_all(db)

    user_records = build_seed_users()
    users = [User(**rec) for rec in user_records]
    for u in users:
        db.add(u)
    await db.flush()
    by_email: dict[str, User] = {u.email: u for u in users}

    deck_specs = build_seed_decks()
    deck_pairs: list[tuple[Deck, dict[str, Any]]] = []
    for spec in deck_specs:
        owner = by_email[spec["owner_email"]]
        deck = Deck(
            owner_id=owner.id,
            title=spec["title"],
            is_public=spec.get("is_public", False),
            content={},
        )
        db.add(deck)
        deck_pairs.append((deck, spec))
    await db.flush()

    for deck, spec in deck_pairs:
        content = dict(spec["content"])
        content["id"] = str(deck.id)
        meta = dict(content.get("meta") or {})
        meta["title"] = spec["title"]
        content["meta"] = meta
        deck.content = content

    deck_a = deck_pairs[0][0]
    collaborator = PresentationCollaborator(
        presentation_id=deck_a.id,
        collaborator_email=BOB_EMAIL,
        role="editor",
    )
    db.add(collaborator)

    version = PresentationVersion(
        presentation_id=deck_a.id,
        author_id=deck_a.owner_id,
        version_number=1,
        label="Initial seed snapshot",
        content=deck_a.content,
    )
    db.add(version)

    await db.commit()

    return {
        "users": len(users),
        "decks": len(deck_pairs),
        "collaborators": 1,
        "versions": 1,
    }
