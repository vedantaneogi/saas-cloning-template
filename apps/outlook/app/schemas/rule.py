import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class RuleCreate(BaseModel):
    name: str
    is_enabled: bool = True
    priority: int = 0
    conditions: list[dict[str, Any]]
    actions: list[dict[str, Any]]
    exceptions: list[dict[str, Any]] = []
    stop_processing: bool = False
    apply_to: str = "incoming"


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    is_enabled: Optional[bool] = None
    priority: Optional[int] = None
    conditions: Optional[list[dict[str, Any]]] = None
    actions: Optional[list[dict[str, Any]]] = None
    exceptions: Optional[list[dict[str, Any]]] = None
    stop_processing: Optional[bool] = None
    apply_to: Optional[str] = None


class RuleOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    is_enabled: bool
    priority: int
    conditions: list[Any]
    actions: list[Any]
    exceptions: list[Any] = []
    stop_processing: bool
    apply_to: str
    created_at: datetime
    updated_at: datetime


class ReorderRequest(BaseModel):
    rule_ids: list[uuid.UUID]


class RunRuleRequest(BaseModel):
    folder_id: uuid.UUID
