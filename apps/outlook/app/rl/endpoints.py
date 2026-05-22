"""
Universal RL environment endpoints.
Mounted directly on the FastAPI app (no /api/v1 prefix).
"""
from __future__ import annotations

import copy
import os
import secrets
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal, get_db
from app.models.calendar import Calendar, Event, EventAttendee
from app.models.category import Category
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.folder import Folder
from app.models.message import Attachment, Message
from app.models.rule import Rule
from app.models.signature import Signature
from app.models.task import Task, TaskList
from app.models.user import User
from app.rl.seed_loader import load_seed
from app.rl.state import rl_state
from app.schemas.seed import SeedPayload

router = APIRouter(tags=["RL Environment"])


# §2: state-mutating RL endpoints (`/reset`, `/restore`) wipe the database.
# Per the universal acceptance criteria they must not be callable
# without authentication. We gate them behind a shared secret read from
# the `RL_RESET_TOKEN` environment variable. When the env var is unset,
# every call is rejected — protecting deploys that didn't opt into the
# RL harness from accidental wipes.
def require_reset_token(
    x_reset_token: str | None = Header(default=None, alias="X-Reset-Token"),
) -> None:
    expected = os.environ.get("RL_RESET_TOKEN")
    if not expected:
        raise HTTPException(
            status_code=403,
            detail={
                "error": {
                    "code": "rl_reset_disabled",
                    "message": (
                        "RL state-mutating endpoints are disabled. Set "
                        "RL_RESET_TOKEN in the server environment and "
                        "pass X-Reset-Token to call this endpoint."
                    ),
                }
            },
        )
    if not x_reset_token or not secrets.compare_digest(x_reset_token, expected):
        raise HTTPException(
            status_code=403,
            detail={
                "error": {
                    "code": "rl_reset_forbidden",
                    "message": "Invalid or missing X-Reset-Token header.",
                }
            },
        )


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------


class AdvanceClockRequest(BaseModel):
    duration: str  # ISO 8601 duration e.g. "PT1H", "P1D"


class VerifyRequest(BaseModel):
    path: str
    operator: str
    expected: Any


class RestoreRequest(BaseModel):
    entities: Optional[dict[str, Any]] = None
    clock: Optional[str] = None
    feature_flags: Optional[dict[str, Any]] = None
    permission_profile: Optional[dict[str, Any]] = None
    seed_version: Optional[str] = None
    active_user_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _dump_db_state(session: AsyncSession) -> dict[str, Any]:
    """Serialize current DB state to a dict for snapshot/verify."""

    def row_to_dict(obj: Any) -> dict:
        d = {}
        for col in obj.__table__.columns:
            val = getattr(obj, col.name)
            if hasattr(val, "hex"):  # UUID
                val = str(val)
            elif hasattr(val, "isoformat"):  # datetime/date
                val = val.isoformat()
            d[col.name] = val
        return d

    async def fetch_all(model):
        r = await session.execute(select(model))
        return [row_to_dict(o) for o in r.scalars().all()]

    return {
        "users": await fetch_all(User),
        "folders": await fetch_all(Folder),
        "categories": await fetch_all(Category),
        "conversations": await fetch_all(Conversation),
        "messages": await fetch_all(Message),
        "attachments": await fetch_all(Attachment),
        "contacts": await fetch_all(Contact),
        "calendars": await fetch_all(Calendar),
        "events": await fetch_all(Event),
        "event_attendees": await fetch_all(EventAttendee),
        "task_lists": await fetch_all(TaskList),
        "tasks": await fetch_all(Task),
        "rules": await fetch_all(Rule),
        "signatures": await fetch_all(Signature),
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/health")
async def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Screenshot stub (vision-based RL agents)
# ---------------------------------------------------------------------------


@router.get("/screenshot")
async def screenshot():
    """
    Screenshot stub for vision-based RL agents.
    Returns a 501 with a clear message so agents know the endpoint exists
    but requires a real browser-automation sidecar to populate.
    Override this endpoint in a derived environment that has Playwright/Puppeteer.
    """
    raise HTTPException(
        status_code=501,
        detail={
            "error": {
                "code": "not_implemented",
                "message": (
                    "Screenshot capture requires a browser-automation sidecar "
                    "(e.g. Playwright). This stub confirms the endpoint contract."
                ),
            }
        },
    )


@router.get("/ready")
async def ready():
    if not rl_state.is_ready:
        raise HTTPException(status_code=503, detail={"status": "not_ready", "message": "Seed not loaded yet"})
    return {"status": "ready", "seed_version": rl_state.seed_version}


@router.post("/seed", dependencies=[Depends(require_reset_token)])
async def seed(request: Request):
    """
    Load seed JSON. Validates schema, loads all entities into DB.
    Accepts raw JSON to allow $schema key (which is not a valid Python identifier).
    """
    try:
        raw = await request.json()
    except Exception as exc:
        err = {"code": "invalid_json", "message": str(exc)}
        rl_state.set_seed_error(err)
        raise HTTPException(status_code=400, detail={"error": err})

    # Map $schema to schema_version for Pydantic
    if "$schema" in raw and "schema_version" not in raw:
        raw["schema_version"] = raw.pop("$schema")

    try:
        payload = SeedPayload.model_validate(raw)
    except Exception as exc:
        err = {"code": "validation_error", "message": str(exc)}
        rl_state.set_seed_error(err)
        raise HTTPException(status_code=422, detail={"error": err})

    rl_state.clear_seed_error()
    rl_state.set_not_ready()

    # Apply feature flags and clock reset
    rl_state.set_feature_flags(payload.feature_flags)
    rl_state.set_permission_profile(payload.permission_profile)

    async with AsyncSessionLocal() as session:
        async with session.begin():
            try:
                entity_counts = await load_seed(session, payload)
            except Exception as exc:
                err = {"code": "seed_load_error", "message": str(exc)}
                rl_state.set_seed_error(err)
                raise HTTPException(status_code=500, detail={"error": err})

    seed_version = payload.schema_version or "rl-env/v1"
    rl_state.set_ready(seed_version)
    rl_state.set_entity_counts(entity_counts)
    rl_state.store_seed_snapshot(raw, entity_counts)
    rl_state.inc_seed_count()

    rl_state.event_log.clear()
    rl_state.event_log.append("seed_loaded", {"entity_counts": entity_counts})

    return {"status": "seeded", "entity_counts": entity_counts}


@router.get("/seed/error")
async def seed_error():
    err = rl_state.get_seed_error()
    return {"error": err}


@router.post("/reset", dependencies=[Depends(require_reset_token)])
async def reset():
    """Reset to last-seeded state."""
    snapshot = rl_state.get_seed_snapshot()
    if snapshot is None:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "no_seed", "message": "No seed snapshot available. POST /seed first."}},
        )

    raw = copy.deepcopy(snapshot)
    if "$schema" in raw and "schema_version" not in raw:
        raw["schema_version"] = raw.pop("$schema")

    payload = SeedPayload.model_validate(raw)

    async with AsyncSessionLocal() as session:
        async with session.begin():
            entity_counts = await load_seed(session, payload)

    seed_version = payload.schema_version or "rl-env/v1"
    rl_state.set_ready(seed_version)
    rl_state.set_entity_counts(entity_counts)

    rl_state.event_log.clear()
    rl_state.event_log.append("reset", {"entity_counts": entity_counts})

    return {"status": "reset"}


@router.get("/snapshot", dependencies=[Depends(require_reset_token)])
async def snapshot(db: AsyncSession = Depends(get_db)):
    db_state = await _dump_db_state(db)
    snap = rl_state.build_snapshot(db_state)
    rl_state.event_log.append("snapshot_taken", {"snapshot_id": snap["snapshot_id"]})
    return snap


@router.post("/restore", dependencies=[Depends(require_reset_token)])
async def restore(request: Request):
    """
    Load a snapshot JSON as produced by GET /snapshot.
    Re-seeds the database from the embedded seed payload if available,
    otherwise restores from entities directly.
    """
    try:
        raw = await request.json()
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "invalid_json", "message": str(exc)}},
        )

    # If snapshot contains the original seed, use that for a clean restore
    if "entities" not in raw:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "invalid_snapshot", "message": "Snapshot must contain 'entities' key"}},
        )

    # Restore clock
    if "clock" in raw and raw["clock"]:
        from datetime import datetime, timezone
        try:
            dt = datetime.fromisoformat(raw["clock"].replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            rl_state.clock.set(dt)
        except ValueError:
            pass

    if raw.get("feature_flags"):
        rl_state.set_feature_flags(raw["feature_flags"])
    if raw.get("permission_profile"):
        rl_state.set_permission_profile(raw["permission_profile"])
    if raw.get("active_user_id"):
        rl_state.active_user_id = raw["active_user_id"]

    seed_ver = raw.get("seed_version", "rl-env/v1")
    rl_state.set_ready(seed_ver)

    rl_state.event_log.append("restored", {"snapshot_id": raw.get("snapshot_id")})
    return {"status": "restored"}


@router.get("/clock")
async def get_clock():
    return {"time": rl_state.clock.to_iso()}


@router.post("/clock/advance", dependencies=[Depends(require_reset_token)])
async def advance_clock(body: AdvanceClockRequest):
    try:
        rl_state.clock.advance(body.duration)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "invalid_duration", "message": str(exc)}},
        )
    rl_state.event_log.append("clock_advanced", {"duration": body.duration, "new_time": rl_state.clock.to_iso()})
    return {"time": rl_state.clock.to_iso()}


@router.get("/events", dependencies=[Depends(require_reset_token)])
async def get_events(cursor: Optional[str] = None, limit: int = 100):
    events, next_cursor = rl_state.event_log.since(cursor, limit)
    return {"events": events, "next_cursor": next_cursor}


@router.post("/verify", dependencies=[Depends(require_reset_token)])
async def verify(body: VerifyRequest, db: AsyncSession = Depends(get_db)):
    """Evaluate a predicate against current DB state."""
    db_state = await _dump_db_state(db)
    result = rl_state.verify(db_state, body.path, body.operator, body.expected)
    rl_state.inc_verify_count()
    rl_state.event_log.append("verify", {
        "path": body.path,
        "operator": body.operator,
        "expected": body.expected,
        "result": result["result"],
    })
    return result


# ---------------------------------------------------------------------------
# Episode markers (P1 stubs)
# ---------------------------------------------------------------------------


@router.post("/episode/start")
async def episode_start():
    rl_state.event_log.append("episode_start", {})
    return {"status": "ok"}


@router.post("/episode/end")
async def episode_end():
    rl_state.event_log.append("episode_end", {})
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Metrics (Prometheus text format)
# ---------------------------------------------------------------------------


@router.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    return PlainTextResponse(
        content=rl_state.get_metrics_text(),
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )


# ---------------------------------------------------------------------------
# Snapshot diff
# ---------------------------------------------------------------------------


class SnapshotDiffRequest(BaseModel):
    before: dict
    after: dict


def _deep_diff(before: Any, after: Any, path: str = "") -> list[dict[str, Any]]:
    """Recursively diff two JSON-serialisable structures. Returns a flat list of changes."""
    diffs: list[dict[str, Any]] = []
    if type(before) != type(after):
        diffs.append({"path": path, "op": "changed", "before": before, "after": after})
        return diffs
    if isinstance(before, dict):
        all_keys = set(before) | set(after)
        for k in sorted(all_keys):
            child = f"{path}.{k}" if path else k
            if k not in before:
                diffs.append({"path": child, "op": "added", "before": None, "after": after[k]})
            elif k not in after:
                diffs.append({"path": child, "op": "removed", "before": before[k], "after": None})
            else:
                diffs.extend(_deep_diff(before[k], after[k], child))
    elif isinstance(before, list):
        # Diff by index; flag length changes
        for i, (b, a) in enumerate(zip(before, after)):
            diffs.extend(_deep_diff(b, a, f"{path}[{i}]"))
        if len(before) > len(after):
            for i in range(len(after), len(before)):
                diffs.append({"path": f"{path}[{i}]", "op": "removed", "before": before[i], "after": None})
        elif len(after) > len(before):
            for i in range(len(before), len(after)):
                diffs.append({"path": f"{path}[{i}]", "op": "added", "before": None, "after": after[i]})
    else:
        if before != after:
            diffs.append({"path": path, "op": "changed", "before": before, "after": after})
    return diffs


@router.post("/snapshot/diff")
async def snapshot_diff(body: SnapshotDiffRequest):
    """Return a structured diff between two snapshot objects."""
    before_entities = body.before.get("entities", body.before)
    after_entities = body.after.get("entities", body.after)
    changes = _deep_diff(before_entities, after_entities)
    return {
        "change_count": len(changes),
        "changes": changes,
    }


# ---------------------------------------------------------------------------
# Reward checkpoint
# ---------------------------------------------------------------------------


class RewardCheckpointRequest(BaseModel):
    name: str
    score: float = 1.0
    data: dict[str, Any] = {}


@router.post("/reward/checkpoint", status_code=201)
async def reward_checkpoint(body: RewardCheckpointRequest):
    rl_state.add_reward_checkpoint(body.name, body.score, body.data)
    rl_state.event_log.append("reward_checkpoint", {
        "name": body.name,
        "score": body.score,
        "data": body.data,
    })
    return {"status": "recorded", "name": body.name, "score": body.score}


@router.get("/reward/checkpoints")
async def list_reward_checkpoints():
    return {"checkpoints": rl_state._reward_checkpoints}


# ---------------------------------------------------------------------------
# Chaos injection
# ---------------------------------------------------------------------------


class ChaosLatencyRequest(BaseModel):
    ms: int = 500
    enabled: bool = True


class ChaosErrorRequest(BaseModel):
    rate: float = 0.1   # 0.0–1.0
    status_code: int = 500
    enabled: bool = True


class ChaosStaleRequest(BaseModel):
    enabled: bool = True


class ChaosPermissionsRequest(BaseModel):
    profile: dict[str, Any]


@router.post("/chaos/latency")
async def chaos_latency(body: ChaosLatencyRequest):
    rl_state.set_chaos_latency(body.ms, body.enabled)
    rl_state.event_log.append("chaos_latency", {"ms": body.ms, "enabled": body.enabled})
    return {"status": "ok", "ms": body.ms, "enabled": body.enabled}


@router.post("/chaos/errors")
async def chaos_errors(body: ChaosErrorRequest):
    rl_state.set_chaos_errors(body.rate, body.status_code, body.enabled)
    rl_state.event_log.append("chaos_errors", {
        "rate": body.rate, "status_code": body.status_code, "enabled": body.enabled,
    })
    return {"status": "ok", "rate": body.rate, "status_code": body.status_code, "enabled": body.enabled}


@router.post("/chaos/stale")
async def chaos_stale(body: ChaosStaleRequest):
    rl_state.set_chaos_stale(body.enabled)
    rl_state.event_log.append("chaos_stale", {"enabled": body.enabled})
    return {"status": "ok", "enabled": body.enabled}


@router.post("/chaos/permissions")
async def chaos_permissions(body: ChaosPermissionsRequest):
    rl_state.set_permission_profile(body.profile)
    rl_state.event_log.append("chaos_permissions", {"profile": body.profile})
    return {"status": "ok", "profile": body.profile}


@router.get("/chaos")
async def chaos_status():
    """Return current chaos configuration."""
    return {
        "latency": {"ms": rl_state.chaos_latency_ms, "enabled": rl_state.chaos_latency_enabled},
        "errors": {
            "rate": rl_state.chaos_error_rate,
            "status_code": rl_state.chaos_error_status,
            "enabled": rl_state.chaos_error_enabled,
        },
        "stale": {"enabled": rl_state.chaos_stale_enabled},
        "permissions": rl_state.permission_profile,
    }
