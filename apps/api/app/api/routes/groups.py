import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.group import Group, GroupMember
from app.models.user import User
from app.rl.state import rl_state

router = APIRouter(prefix="/groups", tags=["Groups"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class GroupOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    description: Optional[str] = None
    email: str
    privacy: str
    color: str
    member_count: int
    is_member: bool = False
    is_owner: bool = False
    created_at: datetime
    updated_at: datetime


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    email: Optional[str] = None
    privacy: str = "public"
    color: str = "#0078D4"


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    privacy: Optional[str] = None
    color: Optional[str] = None


class GroupMemberOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    group_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    joined_at: datetime
    # Hydrated from the User row when the route does the JOIN. Optional to
    # preserve back-compat for callers that don't request it.
    email: Optional[str] = None
    display_name: Optional[str] = None


class AddMemberRequest(BaseModel):
    email: str


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_group_or_404(db: AsyncSession, group_id: uuid.UUID) -> Group:
    result = await db.execute(select(Group).where(Group.id == group_id))
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Group not found"}},
        )
    return g


async def _is_member(db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def _is_owner(db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
            GroupMember.role == "owner",
        )
    )
    return result.scalar_one_or_none() is not None


async def _require_owner(db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID) -> None:
    if not await _is_owner(db, group_id, user_id):
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "not_owner", "message": "Only the group owner can do this"}},
        )


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("", response_model=list[GroupOut])
async def list_groups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Group).order_by(Group.name))
    groups = result.scalars().all()
    out = []
    for g in groups:
        member_q = await db.execute(
            select(GroupMember).where(
                GroupMember.group_id == g.id,
                GroupMember.user_id == current_user.id,
            )
        )
        membership = member_q.scalar_one_or_none()
        d = GroupOut.model_validate(g)
        d.is_member = membership is not None
        d.is_owner = membership is not None and membership.role == "owner"
        out.append(d)
    return out


@router.post("", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
async def create_group(
    body: GroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = rl_state.clock.now()
    email = body.email or f"{body.name.lower().replace(' ', '-')}@company.com"
    g = Group(
        id=uuid.uuid4(),
        name=body.name,
        description=body.description,
        email=email,
        privacy=body.privacy,
        color=body.color,
        member_count=1,
        created_at=now,
        updated_at=now,
    )
    db.add(g)
    await db.flush()

    # Creator becomes owner
    db.add(GroupMember(
        id=uuid.uuid4(),
        group_id=g.id,
        user_id=current_user.id,
        role="owner",
        joined_at=now,
    ))
    await db.flush()
    rl_state.event_log.append("group_created", {"id": str(g.id), "name": g.name})

    out = GroupOut.model_validate(g)
    out.is_member = True
    out.is_owner = True
    return out


@router.patch("/{group_id}", response_model=GroupOut)
async def update_group(
    group_id: uuid.UUID,
    body: GroupUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    g = await _get_group_or_404(db, group_id)
    await _require_owner(db, group_id, current_user.id)

    if body.name is not None:
        g.name = body.name
    if body.description is not None:
        g.description = body.description
    if body.privacy is not None:
        g.privacy = body.privacy
    if body.color is not None:
        g.color = body.color

    g.updated_at = rl_state.clock.now()
    await db.flush()
    rl_state.event_log.append("group_updated", {"id": str(g.id)})

    member_q = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == g.id,
            GroupMember.user_id == current_user.id,
        )
    )
    membership = member_q.scalar_one_or_none()
    out = GroupOut.model_validate(g)
    out.is_member = membership is not None
    out.is_owner = membership is not None and membership.role == "owner"
    return out


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Owner-only group teardown. Memberships cascade via FK ondelete."""
    g = await _get_group_or_404(db, group_id)
    await _require_owner(db, group_id, current_user.id)
    await db.delete(g)
    await db.flush()
    rl_state.event_log.append("group_deleted", {"id": str(group_id), "name": g.name})


@router.post("/{group_id}/join", response_model=GroupMemberOut, status_code=status.HTTP_201_CREATED)
async def join_group(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    g = await _get_group_or_404(db, group_id)

    if await _is_member(db, group_id, current_user.id):
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "already_member", "message": "Already a member of this group"}},
        )

    now = rl_state.clock.now()
    membership = GroupMember(
        id=uuid.uuid4(),
        group_id=group_id,
        user_id=current_user.id,
        role="member",
        joined_at=now,
    )
    db.add(membership)

    # Increment member count
    g.member_count = (g.member_count or 0) + 1
    g.updated_at = now
    await db.flush()
    rl_state.event_log.append("group_joined", {"group_id": str(group_id), "user_id": str(current_user.id)})
    return GroupMemberOut.model_validate(membership)


@router.delete("/{group_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_group(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    g = await _get_group_or_404(db, group_id)

    result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_member", "message": "Not a member of this group"}},
        )

    await db.delete(membership)
    g.member_count = max(0, (g.member_count or 1) - 1)
    g.updated_at = rl_state.clock.now()
    await db.flush()
    rl_state.event_log.append("group_left", {"group_id": str(group_id), "user_id": str(current_user.id)})


@router.get("/{group_id}/members", response_model=list[GroupMemberOut])
async def list_members(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_group_or_404(db, group_id)
    # JOIN User so the UI can render avatar/email/name without N+1.
    result = await db.execute(
        select(GroupMember, User)
        .join(User, User.id == GroupMember.user_id)
        .where(GroupMember.group_id == group_id)
        .order_by(GroupMember.role.desc(), GroupMember.joined_at)
    )
    out: list[GroupMemberOut] = []
    for membership, user in result.all():
        d = GroupMemberOut.model_validate(membership)
        d.email = user.email
        d.display_name = user.display_name
        out.append(d)
    return out


@router.post(
    "/{group_id}/members",
    response_model=GroupMemberOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_member(
    group_id: uuid.UUID,
    body: AddMemberRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    g = await _get_group_or_404(db, group_id)
    await _require_owner(db, group_id, current_user.id)

    target_q = await db.execute(select(User).where(User.email == body.email))
    target = target_q.scalar_one_or_none()
    if not target:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "user_not_found", "message": f"No user with email {body.email}"}},
        )

    # Idempotent: if they're already in the group, just echo the existing row.
    existing_q = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == target.id,
        )
    )
    existing = existing_q.scalar_one_or_none()
    if existing:
        out = GroupMemberOut.model_validate(existing)
        out.email = target.email
        out.display_name = target.display_name
        return out

    now = rl_state.clock.now()
    membership = GroupMember(
        id=uuid.uuid4(),
        group_id=group_id,
        user_id=target.id,
        role="member",
        joined_at=now,
    )
    db.add(membership)
    g.member_count = (g.member_count or 0) + 1
    g.updated_at = now
    await db.flush()
    rl_state.event_log.append(
        "group_member_added",
        {"group_id": str(group_id), "user_id": str(target.id)},
    )
    out = GroupMemberOut.model_validate(membership)
    out.email = target.email
    out.display_name = target.display_name
    return out


@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    g = await _get_group_or_404(db, group_id)
    await _require_owner(db, group_id, current_user.id)

    if user_id == current_user.id:
        # Owner removing themselves should go through /leave so we keep the
        # member-count accounting in one place.
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "cannot_remove_self", "message": "Use /leave to leave the group"}},
        )

    result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_member", "message": "User is not a member of this group"}},
        )

    await db.delete(membership)
    g.member_count = max(0, (g.member_count or 1) - 1)
    g.updated_at = rl_state.clock.now()
    await db.flush()
    rl_state.event_log.append(
        "group_member_removed",
        {"group_id": str(group_id), "user_id": str(user_id)},
    )
