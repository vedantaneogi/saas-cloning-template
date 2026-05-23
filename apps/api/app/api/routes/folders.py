import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.folder import Folder
from app.models.message import Message
from app.models.user import User
from app.rl.state import rl_state
from app.schemas.folder import FolderCreate, FolderOut, FolderUpdate
from app.schemas.message import MessageList, MessageOut

router = APIRouter(prefix="/folders", tags=["Folders"])


async def _get_folder_or_404(db: AsyncSession, folder_id: uuid.UUID, user_id: uuid.UUID) -> Folder:
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == user_id)
    )
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Folder not found"}},
        )
    return folder


@router.get("", response_model=list[FolderOut])
async def list_folders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Lazy backfill: any system folder missing from a legacy DB (e.g.
    # "Scheduled" for users seeded before that folder was added) gets
    # created on first list. Newly-seeded users already have all of them.
    from app.rl.seed_loader import SYSTEM_FOLDERS
    existing_q = await db.execute(
        select(Folder.slug).where(Folder.user_id == current_user.id)
    )
    existing_slugs = {row for row in existing_q.scalars().all()}
    now = rl_state.clock.now()
    backfilled = False
    for spec in SYSTEM_FOLDERS:
        if spec["slug"] in existing_slugs:
            continue
        db.add(Folder(
            id=uuid.uuid4(),
            user_id=current_user.id,
            name=spec["name"],
            slug=spec["slug"],
            icon=spec["icon"],
            sort_order=spec["sort_order"],
            is_system=True,
            unread_count=0,
            total_count=0,
            created_at=now,
            updated_at=now,
        ))
        backfilled = True
    if backfilled:
        await db.flush()

    result = await db.execute(
        select(Folder)
        .where(Folder.user_id == current_user.id)
        .order_by(Folder.sort_order, Folder.name)
    )
    folders = result.scalars().all()
    return [FolderOut.model_validate(f) for f in folders]


@router.post("", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
async def create_folder(
    body: FolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = rl_state.clock.now()
    folder = Folder(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=body.name,
        parent_id=body.parent_id,
        icon=body.icon,
        sort_order=body.sort_order,
        is_system=False,
        created_at=now,
        updated_at=now,
    )
    db.add(folder)
    await db.flush()
    rl_state.event_log.append("folder_created", {"id": str(folder.id), "name": folder.name})
    return FolderOut.model_validate(folder)


@router.patch("/{folder_id}", response_model=FolderOut)
async def update_folder(
    folder_id: uuid.UUID,
    body: FolderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = await _get_folder_or_404(db, folder_id, current_user.id)

    if folder.is_system:
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "system_folder", "message": "System folders cannot be modified"}},
        )

    if body.name is not None:
        folder.name = body.name
    if body.icon is not None:
        folder.icon = body.icon
    if body.sort_order is not None:
        folder.sort_order = body.sort_order
    if body.parent_id is not None:
        # §2 — parent folder must belong to the same user. Without this
        # an authenticated user could reparent their folder under another
        # tenant's UUID and leak hierarchy structure.
        await _get_folder_or_404(db, body.parent_id, current_user.id)
        folder.parent_id = body.parent_id

    folder.updated_at = rl_state.clock.now()
    await db.flush()
    rl_state.event_log.append("folder_updated", {"id": str(folder.id)})
    return FolderOut.model_validate(folder)


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = await _get_folder_or_404(db, folder_id, current_user.id)

    if folder.is_system:
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "system_folder", "message": "System folders cannot be deleted"}},
        )

    # Move contained messages to Deleted Items
    deleted_result = await db.execute(
        select(Folder).where(Folder.user_id == current_user.id, Folder.slug == "deleted")
    )
    deleted_folder = deleted_result.scalar_one_or_none()
    if deleted_folder:
        msgs_result = await db.execute(select(Message).where(Message.folder_id == folder_id))
        for msg in msgs_result.scalars().all():
            msg.folder_id = deleted_folder.id

    await db.delete(folder)
    await db.flush()
    rl_state.event_log.append("folder_deleted", {"id": str(folder_id)})


@router.get("/{folder_id}/messages", response_model=MessageList)
async def list_folder_messages(
    folder_id: uuid.UUID,
    is_read: Optional[bool] = None,
    sort: str = "received_at:desc",
    cursor: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_folder_or_404(db, folder_id, current_user.id)

    filters = [Message.user_id == current_user.id, Message.folder_id == folder_id]
    if is_read is not None:
        filters.append(Message.is_read == is_read)

    total_result = await db.execute(select(func.count()).select_from(Message).where(*filters))
    total = total_result.scalar() or 0

    # §2 — allowlist sortable columns; same rationale as messages.py.
    _SORTABLE_MESSAGE_FIELDS = {
        "received_at", "sent_at", "created_at", "updated_at",
        "subject", "from_address", "from_name", "importance",
        "is_read", "is_flagged", "is_pinned",
    }
    sort_field, sort_dir = (sort.split(":") + ["desc"])[:2]
    if sort_field not in _SORTABLE_MESSAGE_FIELDS:
        sort_field = "received_at"
    sort_col = getattr(Message, sort_field)
    order = desc(sort_col) if sort_dir == "desc" else sort_col

    result = await db.execute(
        select(Message).where(*filters).order_by(order).limit(limit + 1)
    )
    messages = list(result.scalars().all())

    has_more = len(messages) > limit
    items = messages[:limit]
    next_cursor = str(items[-1].id) if has_more else None

    return MessageList(
        items=[MessageOut.model_validate(m) for m in items],
        next_cursor=next_cursor,
        total_count=total,
    )
