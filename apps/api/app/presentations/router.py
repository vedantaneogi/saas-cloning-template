from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.presentations import service
from app.presentations.models import Deck
from app.presentations.schemas import (
    CollaboratorIn,
    CollaboratorOut,
    DeckContentUpdate,
    DeckCreate,
    DeckDetail,
    DeckRename,
    DeckSetPublic,
    DeckSummary,
    DeckThumbnail,
    VersionCreate,
    VersionDetail,
    VersionNameUpdate,
    VersionSummary,
)

router = APIRouter(prefix="/presentations", tags=["presentations"])


async def _build_detail(db: AsyncSession, deck: Deck) -> DeckDetail:
    collaborators = await service.list_collaborators(db, deck.id)
    collab_out = [CollaboratorOut.from_orm_row(c) for c in collaborators]
    return DeckDetail(
        id=deck.id,
        owner_id=deck.owner_id,
        title=deck.title,
        content=deck.content,
        is_public=deck.is_public,
        created_at=deck.created_at,
        updated_at=deck.updated_at,
        collaborators=collab_out,
    )


def _build_summary(deck: Deck) -> DeckSummary:
    content = deck.content or {}
    meta = content.get("meta") or {}
    slides = content.get("slides") or []
    first_slide = slides[0] if slides else None
    thumbnail = DeckThumbnail(
        slide=first_slide if isinstance(first_slide, dict) else None,
        page_width=int(meta.get("pageWidth") or 960),
        page_height=int(meta.get("pageHeight") or 540),
        theme_id=str(meta.get("themeId") or "default"),
    )
    return DeckSummary(
        id=deck.id,
        title=deck.title,
        is_public=deck.is_public,
        created_at=deck.created_at,
        updated_at=deck.updated_at,
        thumbnail=thumbnail,
    )


@router.post(
    "",
    response_model=DeckDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_presentation(
    payload: DeckCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await service.create_deck(db, current_user.id, payload.title)
    return await _build_detail(db, deck)


@router.get("", response_model=list[DeckSummary])
async def list_presentations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DeckSummary]:
    decks = await service.list_decks(db, current_user.id)
    return [_build_summary(d) for d in decks]


@router.get("/{deck_id}", response_model=DeckDetail)
async def get_presentation(
    deck_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await service.get_deck_for_viewer(
        db, deck_id, current_user.id, current_user.email
    )
    if deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    return await _build_detail(db, deck)


@router.patch("/{deck_id}", response_model=DeckDetail)
async def update_presentation_content(
    deck_id: UUID,
    payload: DeckContentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await service.update_deck_content(
        db, deck_id, current_user.id, payload.content, payload.title
    )
    if deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    return await _build_detail(db, deck)


@router.patch("/{deck_id}/rename", response_model=DeckSummary)
async def rename_presentation(
    deck_id: UUID,
    payload: DeckRename,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckSummary:
    deck = await service.rename_deck(db, deck_id, current_user.id, payload.title)
    if deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    return _build_summary(deck)


@router.patch("/{deck_id}/visibility", response_model=DeckSummary)
async def set_presentation_visibility(
    deck_id: UUID,
    payload: DeckSetPublic,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckSummary:
    deck = await service.set_deck_public(
        db, deck_id, current_user.id, payload.is_public
    )
    if deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    return _build_summary(deck)


@router.delete("/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_presentation(
    deck_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    deleted = await service.delete_deck(db, deck_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{deck_id}/public", response_model=DeckDetail)
async def get_public_presentation(
    deck_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await service.get_deck_public(db, deck_id)
    if deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    return await _build_detail(db, deck)


@router.get(
    "/{deck_id}/collaborators",
    response_model=list[CollaboratorOut],
)
async def list_presentation_collaborators(
    deck_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CollaboratorOut]:
    owner_deck = await service.get_deck(db, deck_id, current_user.id)
    if owner_deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    rows = await service.list_collaborators(db, deck_id)
    return [CollaboratorOut.from_orm_row(r) for r in rows]


@router.post(
    "/{deck_id}/collaborators",
    response_model=CollaboratorOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_presentation_collaborator(
    deck_id: UUID,
    payload: CollaboratorIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CollaboratorOut:
    owner_deck = await service.get_deck(db, deck_id, current_user.id)
    if owner_deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    row = await service.add_collaborator(db, deck_id, payload.email, payload.role)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid collaborator email",
        )
    return CollaboratorOut.from_orm_row(row)


@router.delete(
    "/{deck_id}/collaborators/{email}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_presentation_collaborator(
    deck_id: UUID,
    email: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    owner_deck = await service.get_deck(db, deck_id, current_user.id)
    if owner_deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    removed = await service.remove_collaborator(db, deck_id, email)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collaborator not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _version_summary(version, author_name: str | None) -> VersionSummary:
    return VersionSummary(
        id=version.id,
        presentation_id=version.presentation_id,
        author_id=version.author_id,
        author_name=author_name,
        version_number=version.version_number,
        label=version.label,
        created_at=version.created_at,
    )


@router.get(
    "/{deck_id}/versions",
    response_model=list[VersionSummary],
)
async def list_presentation_versions(
    deck_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[VersionSummary]:
    owner_deck = await service.get_deck(db, deck_id, current_user.id)
    if owner_deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    rows = await service.list_versions(db, deck_id)
    return [_version_summary(v, name) for v, name in rows]


@router.post(
    "/{deck_id}/versions",
    response_model=VersionSummary,
    status_code=status.HTTP_201_CREATED,
)
async def create_presentation_version(
    deck_id: UUID,
    payload: VersionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VersionSummary:
    owner_deck = await service.get_deck(db, deck_id, current_user.id)
    if owner_deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    version = await service.create_version(
        db,
        deck_id,
        current_user.id,
        owner_deck.content,
        label=payload.label,
    )
    return _version_summary(version, current_user.name)


@router.get(
    "/{deck_id}/versions/{version_id}",
    response_model=VersionDetail,
)
async def get_presentation_version(
    deck_id: UUID,
    version_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VersionDetail:
    owner_deck = await service.get_deck(db, deck_id, current_user.id)
    if owner_deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    row = await service.get_version_with_author(db, version_id, deck_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Version not found",
        )
    version, author_name = row
    return VersionDetail(
        id=version.id,
        presentation_id=version.presentation_id,
        author_id=version.author_id,
        author_name=author_name,
        version_number=version.version_number,
        label=version.label,
        created_at=version.created_at,
        content=version.content,
    )


@router.patch(
    "/{deck_id}/versions/{version_id}",
    response_model=VersionSummary,
)
async def rename_presentation_version(
    deck_id: UUID,
    version_id: UUID,
    payload: VersionNameUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VersionSummary:
    owner_deck = await service.get_deck(db, deck_id, current_user.id)
    if owner_deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    version = await service.name_version(db, version_id, deck_id, payload.label)
    if version is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Version not found",
        )
    author_row = await service.get_version_with_author(db, version_id, deck_id)
    author_name = author_row[1] if author_row else None
    return _version_summary(version, author_name)


@router.post(
    "/{deck_id}/versions/{version_id}/restore",
    response_model=DeckDetail,
)
async def restore_presentation_version(
    deck_id: UUID,
    version_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await service.restore_version(db, version_id, deck_id, current_user.id)
    if deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Version or presentation not found",
        )
    return await _build_detail(db, deck)
