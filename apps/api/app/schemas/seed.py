from typing import Any, Optional

from pydantic import BaseModel


class WorldPerson(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: Optional[str] = None


class WorldCompany(BaseModel):
    id: str
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    logo_url: Optional[str] = None


class WorldData(BaseModel):
    people: list[WorldPerson] = []
    companies: list[WorldCompany] = []


class ActiveUser(BaseModel):
    world_id: str
    role: str = "worker"
    timezone: str = "America/New_York"
    locale: str = "en-US"
    password: Optional[str] = "password123"


class SeedFolder(BaseModel):
    id: Optional[str] = None
    name: str
    parent: Optional[str] = None
    slug: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0


class SeedMessage(BaseModel):
    id: Optional[str] = None
    folder: str  # slug or id
    conversation_id: Optional[str] = None
    from_address: str
    from_name: Optional[str] = None
    to_addresses: list[dict[str, Any]] = []
    cc_addresses: list[dict[str, Any]] = []
    bcc_addresses: list[dict[str, Any]] = []
    subject: str = ""
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    is_read: bool = False
    is_flagged: bool = False
    is_pinned: bool = False
    is_draft: bool = False
    importance: str = "normal"
    sensitivity: str = "normal"
    has_attachments: bool = False
    reply_type: str = "none"
    in_reply_to_id: Optional[str] = None
    sent_at: Optional[str] = None
    received_at: Optional[str] = None
    snooze_until: Optional[str] = None
    scheduled_send_at: Optional[str] = None


class SeedConversation(BaseModel):
    id: Optional[str] = None
    subject: str
    message_count: int = 1
    has_attachments: bool = False
    last_message_at: Optional[str] = None


class SeedContact(BaseModel):
    id: Optional[str] = None
    world_id: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    address: Optional[dict[str, Any]] = None
    notes: Optional[str] = None
    avatar_url: Optional[str] = None
    is_favorite: bool = False


class SeedCalendar(BaseModel):
    id: Optional[str] = None
    name: str = "Calendar"
    color: str = "#0078D4"
    is_default: bool = False
    is_visible: bool = True


class SeedEventAttendee(BaseModel):
    email: str
    display_name: Optional[str] = None
    response_status: str = "none"
    is_organizer: bool = False
    is_required: bool = True


class SeedEvent(BaseModel):
    id: Optional[str] = None
    calendar: str  # name or id
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: str
    end_time: str
    all_day: bool = False
    is_recurring: bool = False
    recurrence_rule: Optional[dict[str, Any]] = None
    reminder_minutes: int = 15
    is_online_meeting: bool = False
    meeting_url: Optional[str] = None
    status: str = "busy"
    sensitivity: str = "normal"
    attendees: list[SeedEventAttendee] = []


class SeedTask(BaseModel):
    id: Optional[str] = None
    list_name: Optional[str] = None
    title: str
    body: Optional[str] = None
    is_completed: bool = False
    due_date: Optional[str] = None
    reminder_at: Optional[str] = None
    importance: str = "normal"
    source_message_id: Optional[str] = None
    sort_order: int = 0


class SeedTaskList(BaseModel):
    id: Optional[str] = None
    name: str
    is_default: bool = False
    color: Optional[str] = None
    sort_order: int = 0


class SeedRule(BaseModel):
    id: Optional[str] = None
    name: str
    is_enabled: bool = True
    priority: int = 0
    conditions: list[dict[str, Any]] = []
    actions: list[dict[str, Any]] = []
    stop_processing: bool = False
    apply_to: str = "incoming"


class SeedCategory(BaseModel):
    id: Optional[str] = None
    name: str
    color: str


class SeedSignature(BaseModel):
    id: Optional[str] = None
    name: str
    body_html: str
    is_default_new: bool = False
    is_default_reply: bool = False


class SeedOutOfOffice(BaseModel):
    enabled: bool = False
    start: Optional[str] = None
    end: Optional[str] = None
    internal_message: str = ""
    external_message: str = ""


class SeedAttachment(BaseModel):
    id: Optional[str] = None
    message_id: str
    filename: str
    content_type: str
    size_bytes: int
    storage_path: Optional[str] = None
    is_inline: bool = False
    # If set, load real file bytes from apps/api/seeds/samples/<sample_file>
    # into the in-memory attachment store so previews render real content.
    sample_file: Optional[str] = None


class AppData(BaseModel):
    active_user: ActiveUser
    folders: list[SeedFolder] = []
    messages: list[SeedMessage] = []
    conversations: list[SeedConversation] = []
    contacts: list[SeedContact] = []
    calendars: list[SeedCalendar] = []
    events: list[SeedEvent] = []
    tasks: list[SeedTask] = []
    task_lists: list[SeedTaskList] = []
    rules: list[SeedRule] = []
    categories: list[SeedCategory] = []
    signatures: list[SeedSignature] = []
    attachments: list[SeedAttachment] = []
    out_of_office: Optional[SeedOutOfOffice] = None
    feature_flags: dict[str, Any] = {}


class SeedPayload(BaseModel):
    schema_version: Optional[str] = None  # mapped from $schema
    rng_seed: int = 42
    feature_flags: dict[str, Any] = {}
    permission_profile: dict[str, Any] = {}
    world: WorldData = WorldData()
    app_data: AppData

    model_config = {"populate_by_name": True}
