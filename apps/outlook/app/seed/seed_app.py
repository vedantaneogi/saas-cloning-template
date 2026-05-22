"""Seed orchestrator — populates the Outlook clone with demo data.

Reads JSON fixtures from `seed_data/` and writes through the local
SQLAlchemy session (mirrors what the existing seed_loader has always
done — just relocated under apps/outlook/app/). Phase 3 will rewrite
mutation steps to fan out through `app.server.call_tool` so the seed
exercises the same surface the e2e suite drives.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path


SEED_DATA_DIR = Path(__file__).parent.parent / "seed_data"
DEFAULT_SEED = SEED_DATA_DIR / "seed-default.json"


def _resolve_seed_path() -> Path:
    """Honor the SEED_PATH env var, otherwise fall back to default."""
    env = os.environ.get("SEED_PATH")
    if env:
        p = Path(env)
        if p.is_file():
            return p
    if not DEFAULT_SEED.is_file():
        raise FileNotFoundError(
            f"Seed JSON not found at {DEFAULT_SEED} (and SEED_PATH unset)"
        )
    return DEFAULT_SEED


async def _load(seed_path: Path) -> dict[str, int]:
    # Make `app.*` resolvable when the seed container imports this file as
    # a top-level script.
    repo_root = Path(__file__).resolve().parents[2]
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))

    from app.db.session import AsyncSessionLocal
    from app.rl.seed_loader import load_seed
    from app.schemas.seed import SeedPayload

    raw = json.loads(seed_path.read_text())
    if "$schema" in raw and "schema_version" not in raw:
        raw["schema_version"] = raw.pop("$schema")

    payload = SeedPayload.model_validate(raw)
    async with AsyncSessionLocal() as session:
        async with session.begin():
            counts = await load_seed(session, payload)
    return counts


def main() -> None:
    seed_path = _resolve_seed_path()
    print(f"[seed] loading {seed_path.name} ...")
    counts = asyncio.run(_load(seed_path))
    summary = ", ".join(f"{k}={v}" for k, v in sorted(counts.items()))
    print(f"[seed] Done. {summary}")


if __name__ == "__main__":
    main()
