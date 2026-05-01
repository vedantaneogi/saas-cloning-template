import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.folder import Folder
from app.models.message import Message
from app.models.rule import Rule
from app.models.user import User
from app.rl.state import rl_state
from app.schemas.rule import ReorderRequest, RuleCreate, RuleOut, RuleUpdate, RunRuleRequest

router = APIRouter(prefix="/rules", tags=["Rules"])


async def _get_rule_or_404(db: AsyncSession, rule_id: uuid.UUID, user_id: uuid.UUID) -> Rule:
    result = await db.execute(
        select(Rule).where(Rule.id == rule_id, Rule.user_id == user_id)
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Rule not found"}},
        )
    return r


def _message_matches_condition(msg: Message, condition: dict) -> bool:
    field = condition.get("field", "")
    operator = condition.get("operator", "contains")
    value = str(condition.get("value", "")).lower()

    target = ""
    if field == "from":
        target = (msg.from_address or "").lower()
    elif field == "to":
        target = " ".join(a.get("email", "") for a in (msg.to_addresses or [])).lower()
    elif field == "subject":
        target = (msg.subject or "").lower()
    elif field == "body":
        target = (msg.body_text or "").lower()
    elif field == "importance":
        target = (msg.importance or "").lower()
    elif field == "has_attachment":
        return msg.has_attachments == (value.lower() in ("true", "1", "yes"))

    if operator == "contains":
        return value in target
    if operator == "equals":
        return target == value
    if operator == "starts_with":
        return target.startswith(value)
    if operator == "ends_with":
        return target.endswith(value)
    return False


async def _apply_rule_to_message(db: AsyncSession, rule: Rule, msg: Message, user_id: uuid.UUID):
    for action in rule.actions:
        action_type = action.get("type", "")
        params = action.get("params", {})

        if action_type == "mark_as_read":
            msg.is_read = True
        elif action_type == "flag":
            msg.is_flagged = True
        elif action_type == "delete":
            # Move to Deleted Items
            deleted_result = await db.execute(
                select(Folder).where(Folder.user_id == user_id, Folder.slug == "deleted")
            )
            deleted_folder = deleted_result.scalar_one_or_none()
            if deleted_folder:
                msg.folder_id = deleted_folder.id
        elif action_type == "move_to_folder":
            folder_ref = params.get("folder", "")
            folder_result = await db.execute(
                select(Folder).where(
                    Folder.user_id == user_id,
                    Folder.name == folder_ref,
                )
            )
            target_folder = folder_result.scalar_one_or_none()
            if target_folder:
                msg.folder_id = target_folder.id
        elif action_type == "set_importance":
            level = params.get("level", "normal")
            msg.importance = level


@router.get("", response_model=list[RuleOut])
async def list_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Rule)
        .where(Rule.user_id == current_user.id)
        .order_by(Rule.priority)
    )
    return [RuleOut.model_validate(r) for r in result.scalars().all()]


@router.post("", response_model=RuleOut, status_code=status.HTTP_201_CREATED)
async def create_rule(
    body: RuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = rl_state.clock.now()
    rule = Rule(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=body.name,
        is_enabled=body.is_enabled,
        priority=body.priority,
        conditions=body.conditions,
        actions=body.actions,
        stop_processing=body.stop_processing,
        apply_to=body.apply_to,
        created_at=now,
        updated_at=now,
    )
    db.add(rule)
    await db.flush()
    rl_state.event_log.append("rule_created", {"id": str(rule.id)})
    return RuleOut.model_validate(rule)


@router.patch("/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_rules(
    body: ReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for priority, rule_id in enumerate(body.rule_ids):
        result = await db.execute(
            select(Rule).where(Rule.id == rule_id, Rule.user_id == current_user.id)
        )
        rule = result.scalar_one_or_none()
        if rule:
            rule.priority = priority
    await db.flush()
    rl_state.event_log.append("rules_reordered", {"count": len(body.rule_ids)})


@router.patch("/{rule_id}", response_model=RuleOut)
async def update_rule(
    rule_id: uuid.UUID,
    body: RuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = await _get_rule_or_404(db, rule_id, current_user.id)

    if body.name is not None:
        rule.name = body.name
    if body.is_enabled is not None:
        rule.is_enabled = body.is_enabled
    if body.priority is not None:
        rule.priority = body.priority
    if body.conditions is not None:
        rule.conditions = body.conditions
    if body.actions is not None:
        rule.actions = body.actions
    if body.stop_processing is not None:
        rule.stop_processing = body.stop_processing
    if body.apply_to is not None:
        rule.apply_to = body.apply_to

    rule.updated_at = rl_state.clock.now()
    await db.flush()
    rl_state.event_log.append("rule_updated", {"id": str(rule.id)})
    return RuleOut.model_validate(rule)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = await _get_rule_or_404(db, rule_id, current_user.id)
    await db.delete(rule)
    await db.flush()
    rl_state.event_log.append("rule_deleted", {"id": str(rule_id)})


@router.post("/{rule_id}/run")
async def run_rule(
    rule_id: uuid.UUID,
    body: RunRuleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = await _get_rule_or_404(db, rule_id, current_user.id)

    if not rule.is_enabled:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "rule_disabled", "message": "Rule is disabled"}},
        )

    msgs_result = await db.execute(
        select(Message).where(
            Message.folder_id == body.folder_id,
            Message.user_id == current_user.id,
        )
    )
    messages = msgs_result.scalars().all()

    matched = 0
    for msg in messages:
        # All conditions must match
        if all(_message_matches_condition(msg, c) for c in rule.conditions):
            await _apply_rule_to_message(db, rule, msg, current_user.id)
            matched += 1
            if rule.stop_processing:
                break

    await db.flush()
    rl_state.event_log.append("rule_run", {"rule_id": str(rule_id), "matched": matched})
    return {"matched": matched}
