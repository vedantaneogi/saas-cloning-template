# Re-export Base for convenience
from app.db.base_class import Base  # noqa: F401

# Import all models here so Alembic (and create_all) can detect them.
# This file is the single import entrypoint for schema discovery.
# Models import Base from app.db.base_class (not here) to avoid circular imports.
from app.models.user import User  # noqa: F401
from app.models.folder import Folder  # noqa: F401
from app.models.category import Category  # noqa: F401
from app.models.conversation import Conversation  # noqa: F401
from app.models.message import Message, Attachment, MessageCategory  # noqa: F401
from app.models.contact import Contact  # noqa: F401
from app.models.calendar import Calendar, Event, EventAttendee, EventCategory  # noqa: F401
from app.models.task import TaskList, Task  # noqa: F401
from app.models.rule import Rule  # noqa: F401
from app.models.signature import Signature  # noqa: F401
from app.models.quick_step import QuickStep  # noqa: F401
from app.models.delegate import CalendarDelegate  # noqa: F401
