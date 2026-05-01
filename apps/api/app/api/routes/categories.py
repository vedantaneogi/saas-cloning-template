import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.category import Category
from app.models.user import User
from app.rl.state import rl_state
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["Categories"])


async def _get_cat_or_404(db: AsyncSession, cat_id: uuid.UUID, user_id: uuid.UUID) -> Category:
    result = await db.execute(
        select(Category).where(Category.id == cat_id, Category.user_id == user_id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Category not found"}},
        )
    return c


@router.get("", response_model=list[CategoryOut])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category).where(Category.user_id == current_user.id).order_by(Category.name)
    )
    return [CategoryOut.model_validate(c) for c in result.scalars().all()]


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = rl_state.clock.now()
    cat = Category(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=body.name,
        color=body.color,
        created_at=now,
    )
    db.add(cat)
    await db.flush()
    rl_state.event_log.append("category_created", {"id": str(cat.id)})
    return CategoryOut.model_validate(cat)


@router.patch("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: uuid.UUID,
    body: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cat = await _get_cat_or_404(db, category_id, current_user.id)
    if body.name is not None:
        cat.name = body.name
    if body.color is not None:
        cat.color = body.color
    await db.flush()
    rl_state.event_log.append("category_updated", {"id": str(cat.id)})
    return CategoryOut.model_validate(cat)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cat = await _get_cat_or_404(db, category_id, current_user.id)
    await db.delete(cat)
    await db.flush()
    rl_state.event_log.append("category_deleted", {"id": str(category_id)})
