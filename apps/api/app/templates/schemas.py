import uuid
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict


class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    fields_config: Optional[List[Any]] = None
    roles: Optional[List[Any]] = None
    document_ids: Optional[List[str]] = None
    category: Optional[str] = None


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    fields_config: Optional[List[Any]] = None
    roles: Optional[List[Any]] = None
    document_ids: Optional[List[str]] = None
    is_favorite: Optional[bool] = None
    category: Optional[str] = None


class TemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: int
    name: str
    description: Optional[str] = None
    fields_config: Optional[List[Any]] = None
    roles: Optional[List[Any]] = None
    document_ids: Optional[List[Any]] = None
    is_favorite: bool = False
    category: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class TemplateListResponse(BaseModel):
    items: List[TemplateResponse]
    total: int
    page: int
    pages: int
    per_page: int
