"""
In-memory RL environment state manager.
Handles: virtual clock, seed snapshot, reset, snapshot/restore, event log, verify predicates.
"""
from __future__ import annotations

import copy
import json
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional


def _parse_iso_duration(duration: str) -> timedelta:
    """Parse ISO 8601 duration string into timedelta. Supports P[n]DT[n]H[n]M[n]S."""
    pattern = (
        r"P"
        r"(?:(\d+)Y)?"
        r"(?:(\d+)M)?"
        r"(?:(\d+)W)?"
        r"(?:(\d+)D)?"
        r"(?:T"
        r"(?:(\d+)H)?"
        r"(?:(\d+)M)?"
        r"(?:(\d+(?:\.\d+)?)S)?"
        r")?"
    )
    m = re.fullmatch(pattern, duration.strip())
    if not m:
        raise ValueError(f"Invalid ISO 8601 duration: {duration!r}")
    years, months, weeks, days, hours, minutes, seconds = m.groups(default="0")
    total_days = (
        int(years) * 365
        + int(months) * 30
        + int(weeks) * 7
        + int(days)
    )
    return timedelta(
        days=total_days,
        hours=int(hours),
        minutes=int(minutes),
        seconds=float(seconds),
    )


class VirtualClock:
    def __init__(self) -> None:
        self._time: datetime = datetime.now(timezone.utc)

    def now(self) -> datetime:
        return self._time

    def set(self, t: datetime) -> None:
        self._time = t

    def advance(self, duration: str) -> datetime:
        self._time += _parse_iso_duration(duration)
        return self._time

    def to_iso(self) -> str:
        return self._time.isoformat()


class EventLog:
    def __init__(self) -> None:
        self._events: list[dict[str, Any]] = []
        self._counter: int = 0

    def append(self, event_type: str, data: dict[str, Any]) -> None:
        self._counter += 1
        self._events.append(
            {
                "id": str(uuid.uuid4()),
                "seq": self._counter,
                "type": event_type,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": data,
            }
        )

    def since(self, cursor: Optional[str], limit: int = 100) -> tuple[list[dict], Optional[str]]:
        if cursor is None:
            start_seq = 0
        else:
            try:
                start_seq = int(cursor)
            except ValueError:
                start_seq = 0
        filtered = [e for e in self._events if e["seq"] > start_seq]
        page = filtered[:limit]
        next_cursor = str(page[-1]["seq"]) if len(filtered) > limit else None
        return page, next_cursor

    def clear(self) -> None:
        self._events.clear()
        self._counter = 0


def _resolve_path(obj: Any, path: str) -> Any:
    """
    Resolve a dotted/bracketed path on a nested dict/list structure.
    Examples:
        "messages[0].is_read"
        "folders.inbox.unread_count"
        "user.email"
    """
    parts = re.split(r"[\.\[\]]+", path)
    parts = [p for p in parts if p != ""]
    current = obj
    for part in parts:
        if part.isdigit():
            idx = int(part)
            if isinstance(current, list):
                current = current[idx]
            else:
                raise KeyError(f"Expected list at index {part}, got {type(current)}")
        elif isinstance(current, dict):
            current = current[part]
        else:
            raise KeyError(f"Cannot traverse into {type(current)} with key {part!r}")
    return current


def _apply_operator(actual: Any, operator: str, expected: Any) -> bool:
    op = operator.lower()
    if op == "eq":
        return actual == expected
    if op == "ne":
        return actual != expected
    if op == "gt":
        return actual > expected
    if op == "gte":
        return actual >= expected
    if op == "lt":
        return actual < expected
    if op == "lte":
        return actual <= expected
    if op == "contains":
        return expected in actual
    if op == "not_contains":
        return expected not in actual
    if op == "starts_with":
        return str(actual).startswith(str(expected))
    if op == "ends_with":
        return str(actual).endswith(str(expected))
    if op == "is_null":
        return actual is None
    if op == "is_not_null":
        return actual is not None
    if op == "in":
        return actual in expected
    if op == "not_in":
        return actual not in expected
    raise ValueError(f"Unknown operator: {operator!r}")


class RLState:
    """
    Singleton-style in-memory state for the RL environment.
    All mutable state lives here; the DB is the source of truth for entity data
    but snapshot/restore serialises everything needed for determinism.
    """

    def __init__(self) -> None:
        self.clock = VirtualClock()
        self.event_log = EventLog()
        self._is_ready: bool = False
        self._seed_version: Optional[str] = None
        self._seed_snapshot: Optional[dict[str, Any]] = None  # raw seed payload
        self._last_seed_error: Optional[dict[str, Any]] = None
        self._feature_flags: dict[str, Any] = {}
        self._permission_profile: dict[str, Any] = {}
        # Snapshot of DB entity counts at seed time (for /snapshot metadata)
        self._seed_entity_counts: dict[str, int] = {}
        # Active user id (set after seed loads user into DB)
        self.active_user_id: Optional[str] = None

    # ------------------------------------------------------------------
    # Readiness
    # ------------------------------------------------------------------

    def set_ready(self, seed_version: str) -> None:
        self._is_ready = True
        self._seed_version = seed_version

    def set_not_ready(self) -> None:
        self._is_ready = False

    @property
    def is_ready(self) -> bool:
        return self._is_ready

    @property
    def seed_version(self) -> Optional[str]:
        return self._seed_version

    # ------------------------------------------------------------------
    # Seed error tracking
    # ------------------------------------------------------------------

    def set_seed_error(self, error: dict[str, Any]) -> None:
        self._last_seed_error = error

    def get_seed_error(self) -> Optional[dict[str, Any]]:
        return self._last_seed_error

    def clear_seed_error(self) -> None:
        self._last_seed_error = None

    # ------------------------------------------------------------------
    # Snapshot / Restore
    # ------------------------------------------------------------------

    def store_seed_snapshot(self, raw_payload: dict[str, Any], entity_counts: dict[str, int]) -> None:
        self._seed_snapshot = copy.deepcopy(raw_payload)
        self._seed_entity_counts = dict(entity_counts)

    def get_seed_snapshot(self) -> Optional[dict[str, Any]]:
        return self._seed_snapshot

    def build_snapshot(self, db_dump: dict[str, Any]) -> dict[str, Any]:
        """Build a full snapshot that can be round-tripped through /restore."""
        return {
            "snapshot_id": str(uuid.uuid4()),
            "timestamp": self.clock.to_iso(),
            "seed_version": self._seed_version,
            "feature_flags": self._feature_flags,
            "permission_profile": self._permission_profile,
            "clock": self.clock.to_iso(),
            "active_user_id": self.active_user_id,
            "entities": db_dump,
        }

    # ------------------------------------------------------------------
    # Feature flags & permission profile
    # ------------------------------------------------------------------

    def set_feature_flags(self, flags: dict[str, Any]) -> None:
        self._feature_flags = flags

    def set_permission_profile(self, profile: dict[str, Any]) -> None:
        self._permission_profile = profile

    @property
    def feature_flags(self) -> dict[str, Any]:
        return self._feature_flags

    @property
    def permission_profile(self) -> dict[str, Any]:
        return self._permission_profile

    # ------------------------------------------------------------------
    # Entity counts
    # ------------------------------------------------------------------

    def set_entity_counts(self, counts: dict[str, int]) -> None:
        self._seed_entity_counts = counts

    @property
    def entity_counts(self) -> dict[str, int]:
        return self._seed_entity_counts

    # ------------------------------------------------------------------
    # Verify predicate
    # ------------------------------------------------------------------

    def verify(self, state_obj: dict[str, Any], path: str, operator: str, expected: Any) -> dict[str, Any]:
        try:
            actual = _resolve_path(state_obj, path)
            result = _apply_operator(actual, operator, expected)
            diagnostic = f"path={path!r} actual={actual!r} {operator} expected={expected!r} => {result}"
            return {"result": result, "actual": actual, "diagnostic": diagnostic}
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            return {
                "result": False,
                "actual": None,
                "diagnostic": f"Error resolving path {path!r}: {exc}",
            }


# Global singleton
rl_state = RLState()
