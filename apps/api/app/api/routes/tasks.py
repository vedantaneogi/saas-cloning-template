import uuid
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.task import Task
from app.models.user import User
from app.rl.state import rl_state
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["Tasks"])


class TaskList(BaseModel):
    items: list[TaskOut]
    next_cursor: Optional[str] = None
    total_count: int


async def _get_task_or_404(db: AsyncSession, task_id: uuid.UUID, user_id: uuid.UUID) -> Task:
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Task not found"}},
        )
    return t


@router.get("", response_model=TaskList)
async def list_tasks(
    list_id: Optional[uuid.UUID] = None,
    is_completed: Optional[bool] = None,
    due_before: Optional[date] = None,
    due_after: Optional[date] = None,
    importance: Optional[str] = None,
    sort: str = "created_at:desc",
    cursor: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = [Task.user_id == current_user.id]
    if list_id:
        filters.append(Task.list_id == list_id)
    if is_completed is not None:
        filters.append(Task.is_completed == is_completed)
    if due_before:
        filters.append(Task.due_date <= due_before)
    if due_after:
        filters.append(Task.due_date >= due_after)
    if importance:
        filters.append(Task.importance == importance)

    total_result = await db.execute(select(func.count()).select_from(Task).where(*filters))
    total = total_result.scalar() or 0

    sort_field, sort_dir = (sort.split(":") + ["desc"])[:2]
    sort_col = getattr(Task, sort_field, Task.created_at)
    order = desc(sort_col) if sort_dir == "desc" else sort_col

    result = await db.execute(select(Task).where(*filters).order_by(order).limit(limit + 1))
    tasks = list(result.scalars().all())
    has_more = len(tasks) > limit
    items = tasks[:limit]
    next_cursor = str(items[-1].id) if has_more else None

    return TaskList(
        items=[TaskOut.model_validate(t) for t in items],
        next_cursor=next_cursor,
        total_count=total,
    )


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = rl_state.clock.now()
    task = Task(
        id=uuid.uuid4(),
        user_id=current_user.id,
        list_id=body.list_id,
        title=body.title,
        body=body.body,
        due_date=body.due_date,
        reminder_at=body.reminder_at,
        importance=body.importance,
        source_message_id=body.source_message_id,
        parent_task_id=body.parent_task_id,
        recurrence_rule=body.recurrence_rule,
        sort_order=body.sort_order,
        created_at=now,
        updated_at=now,
    )
    db.add(task)
    await db.flush()
    rl_state.event_log.append("task_created", {"id": str(task.id)})
    return TaskOut.model_validate(task)


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: uuid.UUID,
    body: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = await _get_task_or_404(db, task_id, current_user.id)
    now = rl_state.clock.now()

    if body.title is not None:
        task.title = body.title
    if body.body is not None:
        task.body = body.body
    if body.due_date is not None:
        task.due_date = body.due_date
    if body.reminder_at is not None:
        task.reminder_at = body.reminder_at
    if body.importance is not None:
        task.importance = body.importance
    if body.list_id is not None:
        task.list_id = body.list_id
    if body.sort_order is not None:
        task.sort_order = body.sort_order
    if "parent_task_id" in body.model_fields_set:
        task.parent_task_id = body.parent_task_id
    if "recurrence_rule" in body.model_fields_set:
        task.recurrence_rule = body.recurrence_rule
    if body.is_completed is not None:
        task.is_completed = body.is_completed
        task.completed_at = now if body.is_completed else None
        # Recurring task auto-spawn: when a recurring task is completed,
        # create the next occurrence so the user always has the running
        # series queued up. Mirrors To Do.
        if body.is_completed and task.recurrence_rule and task.due_date:
            from datetime import timedelta
            freq = (task.recurrence_rule.get("frequency") or "weekly").lower()
            interval = int(task.recurrence_rule.get("interval") or 1)
            step = {
                "daily": timedelta(days=interval),
                "weekly": timedelta(weeks=interval),
                "monthly": timedelta(days=30 * interval),
                "yearly": timedelta(days=365 * interval),
            }.get(freq, timedelta(weeks=interval))
            next_due = task.due_date + step
            db.add(Task(
                id=uuid.uuid4(),
                user_id=current_user.id,
                list_id=task.list_id,
                title=task.title,
                body=task.body,
                importance=task.importance,
                due_date=next_due,
                parent_task_id=task.parent_task_id,
                recurrence_rule=task.recurrence_rule,
                sort_order=task.sort_order,
                created_at=now,
                updated_at=now,
            ))
    if body.steps is not None:
        task.steps = [s.model_dump() for s in body.steps]

    task.updated_at = now
    await db.flush()
    rl_state.event_log.append("task_updated", {"id": str(task.id)})
    return TaskOut.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = await _get_task_or_404(db, task_id, current_user.id)
    await db.delete(task)
    await db.flush()
    rl_state.event_log.append("task_deleted", {"id": str(task_id)})


@router.post("/{task_id}/complete", response_model=TaskOut)
async def complete_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = await _get_task_or_404(db, task_id, current_user.id)
    now = rl_state.clock.now()
    task.is_completed = True
    task.completed_at = now
    task.updated_at = now
    await db.flush()
    rl_state.event_log.append("task_completed", {"id": str(task.id)})
    return TaskOut.model_validate(task)


@router.post("/{task_id}/uncomplete", response_model=TaskOut)
async def uncomplete_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = await _get_task_or_404(db, task_id, current_user.id)
    now = rl_state.clock.now()
    task.is_completed = False
    task.completed_at = None
    task.updated_at = now
    await db.flush()
    rl_state.event_log.append("task_uncompleted", {"id": str(task.id)})
    return TaskOut.model_validate(task)
