from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class DeckCreate(BaseModel):
    title: str = "Untitled presentation"


class DeckRename(BaseModel):
    title: str = Field(min_length=1, max_length=512)


class DeckContentUpdate(BaseModel):
    content: dict[str, Any]
    title: str = Field(min_length=1, max_length=512)


class DeckSetPublic(BaseModel):
    is_public: bool


class DeckThumbnail(BaseModel):
    """Minimal slice of a deck's content needed to render a static thumbnail.

    Carries slide-1 plus the deck-level rendering metadata so the landing page
    can preview a presentation without fetching (and deserializing) the full
    deck content for every card.
    """

    slide: dict[str, Any] | None = None
    page_width: int = 960
    page_height: int = 540
    theme_id: str = "default"


class DeckSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    is_public: bool
    created_at: datetime
    updated_at: datetime
    thumbnail: DeckThumbnail | None = None


class CollaboratorOut(BaseModel):
    email: str
    role: Literal["viewer", "editor"] = "viewer"
    created_at: datetime

    @classmethod
    def from_orm_row(cls, row: Any) -> "CollaboratorOut":
        return cls(
            email=row.collaborator_email,
            role=row.role,
            created_at=row.created_at,
        )


class CollaboratorIn(BaseModel):
    email: EmailStr
    role: Literal["viewer", "editor"] = "viewer"


class DeckDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: int
    title: str
    content: dict[str, Any]
    is_public: bool
    created_at: datetime
    updated_at: datetime
    collaborators: list[CollaboratorOut] = Field(default_factory=list)


class VersionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    presentation_id: UUID
    author_id: int
    author_name: str | None = None
    version_number: int
    label: str | None = None
    created_at: datetime


class VersionDetail(VersionSummary):
    content: dict[str, Any]


class VersionCreate(BaseModel):
    label: str | None = Field(default=None, max_length=200)


class VersionNameUpdate(BaseModel):
    label: str = Field(min_length=1, max_length=200)
