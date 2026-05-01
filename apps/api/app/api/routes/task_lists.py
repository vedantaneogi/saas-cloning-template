import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.task import TaskList
from app.models.user import User
from app.rl.state import rl_state
from app.schemas.task import TaskListCreate, TaskListOut, TaskListUpdate

router = APIRouter(prefix="/task-lists", tags=["Task Lists"])


async def _get_list_or_404(db: AsyncSession, list_id: uuid.UUID, user_id: uuid.UUID) -> TaskList:
    result = await db.execute(
        select(TaskList).where(TaskList.id == list_id, TaskList.user_id == user_id)
    )
    tl = result.scalar_one_or_none()
    if not tl:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Task list not found"}},
        )
    return tl


@router.get("", response_model=list[TaskListOut])
async def list_task_lists(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TaskList)
        .where(TaskList.user_id == current_user.id)
        .order_by(TaskList.sort_order)
    )
    return [TaskListOut.model_validate(tl) for tl in result.scalars().all()]


@router.post("", response_model=TaskListOut, status_code=status.HTTP_201_CREATED)
async def create_task_list(
    body: TaskListCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = rl_state.clock.now()
    tl = TaskList(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=body.name,
        is_default=False,
        color=body.color,
        sort_order=body.sort_order,
        created_at=now,
    )
    db.add(tl)
    await db.flush()
    rl_state.event_log.append("task_list_created", {"id": str(tl.id)})
    return TaskListOut.model_validate(tl)


@router.patch("/{list_id}", response_model=TaskListOut)
async def update_task_list(
    list_id: uuid.UUID,
    body: TaskListUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tl = await _get_list_or_404(db, list_id, current_user.id)
    if body.name is not None:
        tl.name = body.name
    if body.color is not None:
        tl.color = body.color
    if body.sort_order is not None:
        tl.sort_order = body.sort_order
    await db.flush()
    rl_state.event_log.append("task_list_updated", {"id": str(tl.id)})
    return TaskListOut.model_validate(tl)


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_list(
    list_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tl = await _get_list_or_404(db, list_id, current_user.id)
    if tl.is_default:
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "default_list", "message": "Cannot delete the default task list"}},
        )
    await db.delete(tl)
    await db.flush()
    rl_state.event_log.append("task_list_deleted", {"id": str(list_id)})
