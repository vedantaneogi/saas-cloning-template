"""Room directory endpoints — list + create.

Tenant-wide rooms (no per-user filter). Used by the Event modal's
location-field popover and the Scheduling Assistant Rooms section.
"""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.room import Room
from app.models.user import User

router = APIRouter(prefix="/rooms", tags=["Rooms"])


class RoomOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    location: Optional[str] = None
    capacity: int
    status: str
    created_at: datetime
    updated_at: datetime


class RoomCreate(BaseModel):
    name: str
    location: Optional[str] = None
    capacity: int = 4
    status: str = "available"


@router.get("", response_model=list[RoomOut])
async def list_rooms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Room).order_by(Room.name))
    return list(result.scalars().all())


@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
async def create_room(
    body: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = Room(
        id=uuid.uuid4(),
        name=body.name.strip() or "Untitled room",
        location=(body.location or "").strip() or None,
        capacity=max(1, int(body.capacity or 4)),
        status=body.status if body.status in ("available", "busy") else "available",
    )
    db.add(room)
    await db.flush()
    return room
