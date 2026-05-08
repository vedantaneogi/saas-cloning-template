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


def _addr_list(addrs) -> list[str]:
    return [str(a.get("email", "")).lower() for a in (addrs or [])]


def _message_matches_condition(msg: Message, condition: dict, current_user_email: str = "") -> bool:
    field = condition.get("field", "")
    operator = condition.get("operator", "contains")
    value = str(condition.get("value", "")).lower()
    me = (current_user_email or "").lower()

    to_list = _addr_list(msg.to_addresses)
    cc_list = _addr_list(msg.cc_addresses)
    bcc_list = _addr_list(msg.bcc_addresses)

    if field == "im_on_to":
        return me in to_list
    if field == "im_on_to_or_cc":
        return me in to_list or me in cc_list
    if field == "im_not_on_to":
        return me not in to_list
    if field == "im_only_recipient":
        return to_list == [me] and not cc_list and not bcc_list
    if field == "has_attachment":
        return bool(msg.has_attachments) == (value in ("true", "1", "yes"))
    if field == "flag":
        return bool(msg.is_flagged) == (value in ("true", "1", "yes"))

    target = ""
    if field == "from" or field == "sender_address":
        target = (msg.from_address or "").lower()
    elif field == "to":
        target = " ".join(to_list)
    elif field == "recipient_address":
        target = " ".join(to_list + cc_list + bcc_list)
    elif field == "subject":
        target = (msg.subject or "").lower()
    elif field == "body":
        target = (msg.body_text or "").lower()
    elif field == "subject_or_body":
        target = f"{(msg.subject or '').lower()} {(msg.body_text or '').lower()}"
    elif field == "importance":
        target = (msg.importance or "").lower()
    elif field == "sensitivity":
        target = (msg.sensitivity or "").lower()
    elif field == "message_header":
        # Best-effort: search across the visible headers we expose.
        target = " ".join(filter(None, [
            (msg.from_address or ""),
            (msg.subject or ""),
            " ".join(to_list),
            " ".join(cc_list),
        ])).lower()

    if operator == "contains":
        return value in target
    if operator == "equals":
        return target == value
    if operator == "starts_with":
        return target.startswith(value)
    if operator == "ends_with":
        return target.endswith(value)
    return False


async def _resolve_target_folder(db: AsyncSession, user_id: uuid.UUID, params: dict):
    """Resolve folder picker output to a Folder row. Accepts folder_id (UUID string)
    or legacy folder name. Returns None if unresolved."""
    folder_id_raw = params.get("folder_id") or params.get("folder")
    if not folder_id_raw:
        return None
    # Try UUID first
    try:
        fid = uuid.UUID(str(folder_id_raw))
        result = await db.execute(
            select(Folder).where(Folder.id == fid, Folder.user_id == user_id)
        )
        f = result.scalar_one_or_none()
        if f:
            return f
    except (ValueError, AttributeError):
        pass
    # Fall back to name lookup (backwards compat)
    result = await db.execute(
        select(Folder).where(Folder.user_id == user_id, Folder.name == str(folder_id_raw))
    )
    return result.scalar_one_or_none()


async def _apply_rule_to_message(db: AsyncSession, rule: Rule, msg: Message, user_id: uuid.UUID):
    for action in rule.actions:
        action_type = action.get("type", "")
        params = action.get("params", {}) or {}

        if action_type == "mark_as_read":
            msg.is_read = True
        elif action_type == "flag":
            msg.is_flagged = True
        elif action_type == "delete":
            deleted_result = await db.execute(
                select(Folder).where(Folder.user_id == user_id, Folder.slug == "deleted")
            )
            deleted_folder = deleted_result.scalar_one_or_none()
            if deleted_folder:
                msg.folder_id = deleted_folder.id
        elif action_type in ("move_to_folder", "move_to"):
            target_folder = await _resolve_target_folder(db, user_id, params)
            if target_folder:
                msg.folder_id = target_folder.id
        elif action_type in ("copy_to", "copy_to_folder"):
            # Copy: keep original, drop a clone in the target folder.
            target_folder = await _resolve_target_folder(db, user_id, params)
            if target_folder:
                clone = Message(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    conversation_id=msg.conversation_id,
                    folder_id=target_folder.id,
                    from_address=msg.from_address,
                    from_name=msg.from_name,
                    to_addresses=msg.to_addresses,
                    cc_addresses=msg.cc_addresses,
                    bcc_addresses=msg.bcc_addresses,
                    subject=msg.subject,
                    body_text=msg.body_text,
                    body_html=msg.body_html,
                    is_read=msg.is_read,
                    is_flagged=msg.is_flagged,
                    is_pinned=msg.is_pinned,
                    has_attachments=msg.has_attachments,
                    importance=msg.importance,
                    sensitivity=msg.sensitivity,
                    sent_at=msg.sent_at,
                    received_at=msg.received_at,
                )
                db.add(clone)
        elif action_type == "set_importance":
            level = params.get("level") or params.get("importance") or "normal"
            msg.importance = level
        elif action_type == "set_sensitivity":
            level = params.get("level") or params.get("sensitivity") or "normal"
            msg.sensitivity = level
        elif action_type in ("set_category", "categorize"):
            # Tag with category if provided. Tolerates either category_id or list.
            from app.models.message import MessageCategory  # local import to avoid cycles
            cat_ids = params.get("category_ids") or (
                [params["category_id"]] if params.get("category_id") else []
            )
            for cid in cat_ids:
                try:
                    cuid = uuid.UUID(str(cid))
                except (ValueError, AttributeError):
                    continue
                # Avoid duplicate insert
                exists = await db.execute(
                    select(MessageCategory).where(
                        MessageCategory.message_id == msg.id,
                        MessageCategory.category_id == cuid,
                    )
                )
                if not exists.scalar_one_or_none():
                    db.add(MessageCategory(
                        id=uuid.uuid4(),
                        message_id=msg.id,
                        category_id=cuid,
                    ))
        # forward_to / forward_as_attachment / redirect_to are no-ops in this
        # local-only clone (no external mail bridge), but accepted for round-trip.


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
        exceptions=body.exceptions or [],
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
    if body.exceptions is not None:
        rule.exceptions = body.exceptions
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
    me = current_user.email
    for msg in messages:
        # All conditions must match, AND no exception matches.
        if not all(_message_matches_condition(msg, c, me) for c in rule.conditions):
            continue
        if rule.exceptions and any(_message_matches_condition(msg, e, me) for e in rule.exceptions):
            continue
        await _apply_rule_to_message(db, rule, msg, current_user.id)
        matched += 1
        # Note: stop_processing applies to auto-run (which other rules to run
        # after this on a single delivered message), NOT to manual run-on-
        # folder. The user explicitly clicked Run; iterate every match.

    await db.flush()
    rl_state.event_log.append("rule_run", {"rule_id": str(rule_id), "matched": matched})
    return {"matched": matched}
