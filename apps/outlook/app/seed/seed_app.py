"""Seed orchestrator — populates the Outlook clone with demo data.

Phase 1: this is a thin wrapper around the existing legacy seed loader
at `apps/api/app/rl/seed_loader.py`. The legacy loader reads
`seed_data/*.json` files and writes via SQLAlchemy directly.

Phase 2 rewrites this to dispatch every seed step through `call_tool`
per the §1 contract:

    from app.server import call_tool
    call_tool("signup", {...})
    call_tool("create_folder", {...})
    call_tool("create_message", {...})

For now it imports the legacy loader and runs it against the configured
database URL.
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
    """Honor the legacy SEED_PATH env var, otherwise fall back to default."""
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


async def _legacy_load(seed_path: Path) -> dict[str, int]:
    """Run the legacy SQLAlchemy seed loader against the configured DB."""
    # Make the apps/api package importable when this script runs out of
    # its container without the workspace install (e.g. local debug).
    repo_root = Path(__file__).resolve().parents[4]
    legacy_api_root = repo_root / "apps" / "api"
    if str(legacy_api_root) not in sys.path:
        sys.path.insert(0, str(legacy_api_root))

    from app.db.session import AsyncSessionLocal  # type: ignore
    from app.rl.seed_loader import load_seed  # type: ignore
    from app.schemas.seed import SeedPayload  # type: ignore

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
    counts = asyncio.run(_legacy_load(seed_path))
    summary = ", ".join(f"{k}={v}" for k, v in sorted(counts.items()))
    print(f"[seed] Done. {summary}")


if __name__ == "__main__":
    main()
