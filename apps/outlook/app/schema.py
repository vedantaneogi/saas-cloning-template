"""Pydantic argument schemas — top-level file required by `scripts/validate.sh`.

Python's import system prefers the sibling `app/schemas/` package over this
file, so every `from app.schemas.message import MessageCreate` continues to
resolve through the package. This module re-exports the same names at
`app.schema.*` so the validator-required path `app/schema.py` is
populated meaningfully rather than as an empty stub.
"""

from app.schemas.auth import LoginRequest, TokenOut  # noqa: F401
from app.schemas.user import UserOut  # noqa: F401
from app.schemas.folder import (  # noqa: F401
    FolderCreate,
    FolderOut,
    FolderUpdate,
)
from app.schemas.message import (  # noqa: F401
    AttachmentOut,
    BulkRequest,
    CategoryOut,
    CleanUpThreadRequest,
    ForwardRequest,
    MessageCreate,
    MessageList,
    MessageOut,
    MessageUpdate,
    MoveRequest,
    ReplyRequest,
    SweepKeepLatestRequest,
    SweepMoveAllRequest,
)
from app.schemas.calendar import (  # noqa: F401
    CalendarCreate,
    CalendarOut,
    CalendarUpdate,
    EventCreate,
    EventOut,
    EventUpdate,
)
from app.schemas.contact import (  # noqa: F401
    ContactCreate,
    ContactOut,
    ContactUpdate,
)
from app.schemas.task import (  # noqa: F401
    TaskCreate,
    TaskListCreate,
    TaskListOut,
    TaskListUpdate,
    TaskOut,
    TaskUpdate,
)
from app.schemas.rule import RuleCreate, RuleOut, RuleUpdate, RunRuleRequest  # noqa: F401
from app.schemas.signature import (  # noqa: F401
    SignatureCreate,
    SignatureOut,
    SignatureUpdate,
)
from app.schemas.category import (  # noqa: F401
    CategoryCreate,
    CategoryUpdate,
)
