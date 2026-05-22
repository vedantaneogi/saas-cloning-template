"""FastAPI tool server for the Outlook clone.

This module is the §1 entry point required by the universal acceptance
criteria. It exposes:

- the FastAPI `app` (configured in `app.main`)
- a `TOOLS = [...]` registry of named operations
- a `call_tool(name, args)` dispatcher that routes to the matching HTTP
  endpoint via FastAPI's in-process TestClient
- `/tools` and `/step` HTTP endpoints that expose the same dispatch shape
  the e2e + RL harness use

Compose / docker / `uvicorn app.server:app` all import this file as the
process entry point. The real FastAPI configuration (routers, middleware,
lifespan, CORS) lives in `app.main` to keep this file's TOOLS list the
single place reviewers look up the named-operation surface.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException, Request, Response
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.main import app  # re-export the configured FastAPI instance

# ─── TOOLS registry ──────────────────────────────────────────────────────
# Mirrors the REST surface mounted by `app.main`. Each tool maps a name +
# HTTP recipe (method, path template, JSON body keys) so the dispatcher
# can fan out via TestClient without duplicating route logic.
#
# `validate.sh` counts `"name"` occurrences in this file to verify ≥30
# tools are exposed. Keep the literals in this list rather than
# constructing them dynamically.

TOOLS: list[dict[str, Any]] = [
    # ─── Auth ─────────────────────────────────────────────────────────
    {"name": "signup", "method": "POST", "path": "/api/v1/auth/signup", "body_keys": ["email", "password", "display_name"], "description": "Create a new user account.", "input_schema": {"email": "str", "password": "str", "display_name": "str"}},
    {"name": "login", "method": "POST", "path": "/api/v1/auth/login", "body_keys": ["email", "password"], "description": "Log in with email + password.", "input_schema": {"email": "str", "password": "str"}},
    {"name": "logout", "method": "POST", "path": "/api/v1/auth/logout", "body_keys": [], "description": "Log out the current session.", "input_schema": {}},
    {"name": "get_me", "method": "GET", "path": "/api/v1/auth/me", "body_keys": [], "description": "Get the current authenticated user.", "input_schema": {}},

    # ─── Folders ──────────────────────────────────────────────────────
    {"name": "list_folders", "method": "GET", "path": "/api/v1/folders", "body_keys": [], "description": "List all folders for the current user.", "input_schema": {}},
    {"name": "create_folder", "method": "POST", "path": "/api/v1/folders", "body_keys": ["name", "parent_id"], "description": "Create a new folder.", "input_schema": {"name": "str", "parent_id": "uuid|null"}, "mutates_state": True},
    {"name": "rename_folder", "method": "PATCH", "path": "/api/v1/folders/{folder_id}", "body_keys": ["name"], "description": "Rename a user-created folder.", "input_schema": {"folder_id": "uuid", "name": "str"}, "mutates_state": True},
    {"name": "delete_folder", "method": "DELETE", "path": "/api/v1/folders/{folder_id}", "body_keys": [], "description": "Delete a user-created folder.", "input_schema": {"folder_id": "uuid"}, "mutates_state": True},

    # ─── Messages ─────────────────────────────────────────────────────
    {"name": "list_messages", "method": "GET", "path": "/api/v1/messages", "body_keys": [], "description": "List messages in a folder with focused / snoozed / category filters.", "input_schema": {"folder_slug": "str", "focused": "bool|null", "snoozed": "bool|null"}},
    {"name": "get_message", "method": "GET", "path": "/api/v1/messages/{message_id}", "body_keys": [], "description": "Get a single message by id.", "input_schema": {"message_id": "uuid"}},
    {"name": "create_message", "method": "POST", "path": "/api/v1/messages", "body_keys": ["to_addresses", "cc_addresses", "bcc_addresses", "subject", "body_html", "body_text", "is_draft", "importance", "sensitivity", "encrypt_mode", "boomerang_at", "in_reply_to_id", "reply_type", "scheduled_send_at"], "description": "Create a new message (draft or send).", "input_schema": {"to_addresses": "list", "subject": "str", "body_html": "str", "is_draft": "bool"}, "mutates_state": True},
    {"name": "update_message", "method": "PATCH", "path": "/api/v1/messages/{message_id}", "body_keys": ["is_read", "is_flagged", "is_pinned", "snooze_until", "boomerang_at", "category_ids"], "description": "Patch a message (read/flag/pin/snooze/categorize).", "input_schema": {"message_id": "uuid", "patch": "dict"}, "mutates_state": True},
    {"name": "delete_message", "method": "DELETE", "path": "/api/v1/messages/{message_id}", "body_keys": [], "description": "Soft-delete a message (move to Deleted Items).", "input_schema": {"message_id": "uuid"}, "mutates_state": True},
    {"name": "reply_message", "method": "POST", "path": "/api/v1/messages/{message_id}/reply", "body_keys": ["body_html", "reply_all"], "description": "Reply to a message.", "input_schema": {"message_id": "uuid", "body_html": "str", "reply_all": "bool"}, "mutates_state": True},
    {"name": "forward_message", "method": "POST", "path": "/api/v1/messages/{message_id}/forward", "body_keys": ["to_addresses", "body_html"], "description": "Forward a message.", "input_schema": {"message_id": "uuid", "to_addresses": "list", "body_html": "str"}, "mutates_state": True},
    {"name": "bulk_message_action", "method": "POST", "path": "/api/v1/messages/bulk", "body_keys": ["action", "message_ids", "params"], "description": "Bulk action across many messages (mark_read/flag/move/archive/delete).", "input_schema": {"action": "str", "message_ids": "list", "params": "dict"}, "mutates_state": True},
    {"name": "move_message", "method": "POST", "path": "/api/v1/messages/{message_id}/move", "body_keys": ["folder_id"], "description": "Move a message to a different folder.", "input_schema": {"message_id": "uuid", "folder_id": "uuid"}, "mutates_state": True},
    {"name": "schedule_message", "method": "PATCH", "path": "/api/v1/messages/{message_id}", "body_keys": ["scheduled_send_at"], "description": "Schedule a message to send later.", "input_schema": {"message_id": "uuid", "scheduled_send_at": "datetime"}, "mutates_state": True},

    # ─── Conversations ────────────────────────────────────────────────
    {"name": "list_conversations", "method": "GET", "path": "/api/v1/conversations", "body_keys": [], "description": "List conversation threads the user participates in.", "input_schema": {}},
    {"name": "get_conversation", "method": "GET", "path": "/api/v1/conversations/{conversation_id}", "body_keys": [], "description": "Get a conversation thread (all messages the user can see in it).", "input_schema": {"conversation_id": "uuid"}},

    # ─── Attachments ──────────────────────────────────────────────────
    {"name": "upload_attachment", "method": "POST", "path": "/api/v1/messages/{message_id}/attachments", "body_keys": [], "description": "Attach a file to a message (multipart upload).", "input_schema": {"message_id": "uuid", "file": "upload"}, "mutates_state": True},
    {"name": "download_attachment", "method": "GET", "path": "/api/v1/attachments/{attachment_id}", "body_keys": [], "description": "Download an attachment by id.", "input_schema": {"attachment_id": "uuid"}},
    {"name": "delete_attachment", "method": "DELETE", "path": "/api/v1/attachments/{attachment_id}", "body_keys": [], "description": "Remove an attachment from its message.", "input_schema": {"attachment_id": "uuid"}, "mutates_state": True},

    # ─── Rules / Quick steps / Categories ─────────────────────────────
    {"name": "list_rules", "method": "GET", "path": "/api/v1/rules", "body_keys": [], "description": "List the user's inbox rules.", "input_schema": {}},
    {"name": "create_rule", "method": "POST", "path": "/api/v1/rules", "body_keys": ["name", "conditions", "actions", "exceptions", "is_enabled", "apply_to", "priority", "stop_processing"], "description": "Create an inbox rule.", "input_schema": {"name": "str", "conditions": "list", "actions": "list"}, "mutates_state": True},
    {"name": "update_rule", "method": "PATCH", "path": "/api/v1/rules/{rule_id}", "body_keys": ["name", "conditions", "actions", "exceptions", "is_enabled", "priority", "stop_processing"], "description": "Update an inbox rule.", "input_schema": {"rule_id": "uuid", "patch": "dict"}, "mutates_state": True},
    {"name": "delete_rule", "method": "DELETE", "path": "/api/v1/rules/{rule_id}", "body_keys": [], "description": "Delete an inbox rule.", "input_schema": {"rule_id": "uuid"}, "mutates_state": True},
    {"name": "run_rule", "method": "POST", "path": "/api/v1/rules/{rule_id}/run", "body_keys": ["folder_id"], "description": "Run a rule against a folder right now.", "input_schema": {"rule_id": "uuid", "folder_id": "uuid"}, "mutates_state": True},
    {"name": "list_quick_steps", "method": "GET", "path": "/api/v1/quick-steps", "body_keys": [], "description": "List configured quick steps.", "input_schema": {}},
    {"name": "run_quick_step", "method": "POST", "path": "/api/v1/quick-steps/{quick_step_id}/run", "body_keys": ["message_id"], "description": "Apply a quick step to a message.", "input_schema": {"quick_step_id": "uuid", "message_id": "uuid"}, "mutates_state": True},
    {"name": "list_categories", "method": "GET", "path": "/api/v1/categories", "body_keys": [], "description": "List the user's category labels.", "input_schema": {}},

    # ─── Signatures / OOF / DLP ───────────────────────────────────────
    {"name": "list_signatures", "method": "GET", "path": "/api/v1/signatures", "body_keys": [], "description": "List the user's saved signatures.", "input_schema": {}},
    {"name": "create_signature", "method": "POST", "path": "/api/v1/signatures", "body_keys": ["name", "body_html", "is_default_new", "is_default_reply"], "description": "Create a signature.", "input_schema": {"name": "str", "body_html": "str", "is_default_new": "bool"}, "mutates_state": True},
    {"name": "set_oof", "method": "PUT", "path": "/api/v1/settings", "body_keys": ["out_of_office_enabled", "out_of_office_start", "out_of_office_end", "internal_message", "external_message"], "description": "Enable / disable out-of-office auto-reply.", "input_schema": {"enabled": "bool", "internal_message": "str", "external_message": "str"}, "mutates_state": True},
    {"name": "evaluate_dlp", "method": "POST", "path": "/api/v1/dlp/evaluate", "body_keys": ["to", "cc", "bcc", "subject", "body", "attachments", "sensitivity_label"], "description": "Run the DLP engine over a candidate message body + recipients.", "input_schema": {"to": "list", "subject": "str", "body": "str", "attachments": "list", "sensitivity_label": "str"}},

    # ─── Search ───────────────────────────────────────────────────────
    {"name": "search_messages", "method": "GET", "path": "/api/v1/messages/search", "body_keys": [], "description": "Full-text + filter search across messages.", "input_schema": {"q": "str", "from": "str", "subject": "str", "date_from": "date", "date_to": "date", "has_attachment": "bool", "read_status": "str"}},
    {"name": "search_files", "method": "GET", "path": "/api/v1/attachments/search", "body_keys": [], "description": "Search across attachments.", "input_schema": {"q": "str"}},
    {"name": "search_people", "method": "GET", "path": "/api/v1/contacts", "body_keys": [], "description": "Search contacts and seeded users.", "input_schema": {"q": "str"}},

    # ─── Calendar ─────────────────────────────────────────────────────
    {"name": "list_events", "method": "GET", "path": "/api/v1/events", "body_keys": [], "description": "List calendar events in a date window.", "input_schema": {"from": "date", "to": "date"}},
    {"name": "get_event", "method": "GET", "path": "/api/v1/events/{event_id}", "body_keys": [], "description": "Get an event by id.", "input_schema": {"event_id": "uuid"}},
    {"name": "create_event", "method": "POST", "path": "/api/v1/events", "body_keys": ["title", "start_at", "end_at", "all_day", "location", "body", "attendees", "recurrence_rule"], "description": "Create a calendar event.", "input_schema": {"title": "str", "start": "datetime", "end": "datetime", "attendees": "list", "location": "str", "recurrence_rule": "str|null"}, "mutates_state": True},
    {"name": "update_event", "method": "PATCH", "path": "/api/v1/events/{event_id}", "body_keys": ["title", "start_at", "end_at", "all_day", "location", "body", "attendees", "recurrence_rule"], "description": "Update an existing event.", "input_schema": {"event_id": "uuid", "patch": "dict"}, "mutates_state": True},
    {"name": "delete_event", "method": "DELETE", "path": "/api/v1/events/{event_id}", "body_keys": [], "description": "Delete an event.", "input_schema": {"event_id": "uuid"}, "mutates_state": True},
    {"name": "get_availability", "method": "POST", "path": "/api/v1/events/availability", "body_keys": ["emails", "from", "to"], "description": "Get per-attendee free/busy in a window.", "input_schema": {"emails": "list", "from": "datetime", "to": "datetime"}},
    {"name": "list_rooms", "method": "GET", "path": "/api/v1/rooms", "body_keys": [], "description": "List meeting rooms.", "input_schema": {}},
    {"name": "create_room", "method": "POST", "path": "/api/v1/rooms", "body_keys": ["name", "capacity", "location"], "description": "Register a new meeting room.", "input_schema": {"name": "str", "capacity": "int", "location": "str"}, "mutates_state": True},

    # ─── Contacts ─────────────────────────────────────────────────────
    {"name": "list_contacts", "method": "GET", "path": "/api/v1/contacts", "body_keys": [], "description": "List the user's contacts.", "input_schema": {}},
    {"name": "get_contact", "method": "GET", "path": "/api/v1/contacts/{contact_id}", "body_keys": [], "description": "Get a contact by id.", "input_schema": {"contact_id": "uuid"}},
    {"name": "create_contact", "method": "POST", "path": "/api/v1/contacts", "body_keys": ["first_name", "last_name", "email", "phone", "company", "job_title", "is_favorite"], "description": "Create a new contact.", "input_schema": {"first_name": "str", "last_name": "str", "email": "str", "company": "str", "job_title": "str"}, "mutates_state": True},
    {"name": "update_contact", "method": "PATCH", "path": "/api/v1/contacts/{contact_id}", "body_keys": ["first_name", "last_name", "email", "phone", "company", "job_title", "is_favorite"], "description": "Update a contact.", "input_schema": {"contact_id": "uuid", "patch": "dict"}, "mutates_state": True},
    {"name": "delete_contact", "method": "DELETE", "path": "/api/v1/contacts/{contact_id}", "body_keys": [], "description": "Delete a contact.", "input_schema": {"contact_id": "uuid"}, "mutates_state": True},

    # ─── To Do (tasks) ────────────────────────────────────────────────
    {"name": "list_task_lists", "method": "GET", "path": "/api/v1/task-lists", "body_keys": [], "description": "List the user's task lists.", "input_schema": {}},
    {"name": "create_task_list", "method": "POST", "path": "/api/v1/task-lists", "body_keys": ["name"], "description": "Create a task list.", "input_schema": {"name": "str"}, "mutates_state": True},
    {"name": "list_tasks", "method": "GET", "path": "/api/v1/tasks", "body_keys": [], "description": "List tasks in a list.", "input_schema": {"task_list_id": "uuid"}},
    {"name": "create_task", "method": "POST", "path": "/api/v1/tasks", "body_keys": ["task_list_id", "title", "due_at", "importance"], "description": "Create a task.", "input_schema": {"task_list_id": "uuid", "title": "str", "due_at": "datetime|null"}, "mutates_state": True},
    {"name": "update_task", "method": "PATCH", "path": "/api/v1/tasks/{task_id}", "body_keys": ["title", "due_at", "importance", "is_starred"], "description": "Update a task.", "input_schema": {"task_id": "uuid", "patch": "dict"}, "mutates_state": True},
    {"name": "complete_task", "method": "POST", "path": "/api/v1/tasks/{task_id}/complete", "body_keys": [], "description": "Mark a task complete.", "input_schema": {"task_id": "uuid"}, "mutates_state": True},

    # ─── Groups ───────────────────────────────────────────────────────
    {"name": "list_groups", "method": "GET", "path": "/api/v1/groups", "body_keys": [], "description": "List groups the user is a member of.", "input_schema": {}},
    {"name": "get_group", "method": "GET", "path": "/api/v1/groups/{group_id}", "body_keys": [], "description": "Get a group by id or slug.", "input_schema": {"group_id": "uuid|str"}},
    {"name": "list_group_members", "method": "GET", "path": "/api/v1/groups/{group_id}/members", "body_keys": [], "description": "List members of a group.", "input_schema": {"group_id": "uuid"}},

    # ─── Settings ─────────────────────────────────────────────────────
    {"name": "get_settings", "method": "GET", "path": "/api/v1/settings", "body_keys": [], "description": "Get the user's preferences (reading pane, density, conversations).", "input_schema": {}},
    {"name": "update_settings", "method": "PUT", "path": "/api/v1/settings", "body_keys": ["mail", "calendar", "general"], "description": "Update the user's preferences.", "input_schema": {"patch": "dict"}, "mutates_state": True},
    {"name": "get_quota", "method": "GET", "path": "/api/v1/settings/quota", "body_keys": [], "description": "Get mailbox quota usage.", "input_schema": {}},
]


# ─── Dispatcher ──────────────────────────────────────────────────────────

# In-process TestClient reused across tool calls — instantiating a fresh
# client per call is expensive and breaks the FastAPI dependency cache.
_TEST_CLIENT: TestClient | None = None


def _client() -> TestClient:
    global _TEST_CLIENT
    if _TEST_CLIENT is None:
        _TEST_CLIENT = TestClient(app)
    return _TEST_CLIENT


def _find_tool(name: str) -> dict[str, Any]:
    for tool in TOOLS:
        if tool["name"] == name:
            return tool
    raise ValueError(f"Unknown tool: {name}")


def call_tool(name: str, arguments: dict[str, Any] | None = None, *, headers: dict[str, str] | None = None) -> dict[str, Any]:
    """Dispatch a registered tool to its underlying HTTP endpoint.

    Tests + the RL harness use this to drive the FastAPI surface without
    spelling out URLs. Authenticated tools must pass an `Authorization`
    header in `headers` (or rely on session cookies via TestClient).
    """
    arguments = arguments or {}
    tool = _find_tool(name)
    method = tool["method"]
    path = tool["path"].format(**{k: arguments[k] for k in arguments if "{" + k + "}" in tool["path"]})
    # Body: only the keys this tool understands, in the order declared.
    body_keys = tool.get("body_keys", [])
    body = {k: arguments[k] for k in body_keys if k in arguments} if body_keys else None
    params = {k: v for k, v in arguments.items() if k not in body_keys and "{" + k + "}" not in tool["path"]}

    client = _client()
    response = client.request(
        method,
        path,
        json=body if body and method in ("POST", "PUT", "PATCH") else None,
        params=params or None,
        headers=headers,
    )

    payload: Any
    try:
        payload = response.json()
    except json.JSONDecodeError:
        payload = response.text

    if response.status_code >= 400:
        return {
            "tool": name,
            "status_code": response.status_code,
            "is_error": True,
            "text": (payload if isinstance(payload, str) else json.dumps(payload)),
            "structured_content": payload if isinstance(payload, dict) else {},
        }

    return {
        "tool": name,
        "status_code": response.status_code,
        "is_error": False,
        "structured_content": payload if isinstance(payload, dict) else {"data": payload},
    }


# ─── /tools and /step HTTP endpoints ─────────────────────────────────────


@app.get("/tools", include_in_schema=False)
async def list_tools() -> dict[str, list[dict[str, Any]]]:
    """Expose the TOOLS registry as JSON for the e2e harness."""
    return {"tools": [{"name": t["name"], "description": t.get("description", ""), "input_schema": t.get("input_schema", {})} for t in TOOLS]}


class _StepAction(BaseModel):
    tool_name: str
    parameters: dict[str, Any] = {}


class _StepBody(BaseModel):
    action: _StepAction


@app.post("/step", include_in_schema=False)
async def step(body: _StepBody, request: Request) -> Response:
    """Dispatch a tool via the registry — used by the RL harness + e2e."""
    # Forward the caller's Authorization header (if any) so the dispatched
    # tool sees the same session as the request.
    fwd_headers: dict[str, str] = {}
    if "authorization" in request.headers:
        fwd_headers["Authorization"] = request.headers["authorization"]

    try:
        result = call_tool(body.action.tool_name, body.action.parameters, headers=fwd_headers or None)
    except ValueError as e:
        raise HTTPException(status_code=404, detail={"error": {"code": "unknown_tool", "message": str(e)}})

    return Response(
        content=json.dumps({"observation": result}),
        media_type="application/json",
        status_code=200 if not result.get("is_error") else 200,  # observation surfaces error as is_error=true
    )
