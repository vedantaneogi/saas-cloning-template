"""Pydantic argument schemas for the Outlook clone tool registry.

Phase 2 fills this with one Pydantic model per `TOOLS[i]` entry so
`TOOLS[i]["input_schema"]` can use `Model.model_json_schema()`.
For Phase 1 we re-export the existing schemas from `apps/api/app/schemas/`
so the §1 file-existence check passes.
"""

from __future__ import annotations

try:
    from apps.api.app.schemas.message import (  # type: ignore  # noqa: F401
        MessageCreate,
        MessageOut,
        MessageUpdate,
        ReplyRequest,
        ForwardRequest,
        BulkRequest,
        MoveRequest,
    )
    from apps.api.app.schemas.folder import FolderCreate, FolderOut  # type: ignore  # noqa: F401
    from apps.api.app.schemas.user import LoginRequest, SignupRequest  # type: ignore  # noqa: F401
except ImportError:
    pass
