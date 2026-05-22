"""pytest entry — exercises the TOOLS registry contract end-to-end.

Verifies:
- the registry shape (size, uniqueness, required core tools)
- `call_tool` dispatches into the live FastAPI app via TestClient
- `/tools` and `/step` HTTP endpoints behave correctly
- §2 security: `/rl/reset` is gated by X-Reset-Token when RL_RESET_TOKEN
  is set, and rejected otherwise.
"""

from __future__ import annotations

import importlib
import os
import sys
from pathlib import Path

import pytest


sys.path.insert(0, str(Path(__file__).resolve().parents[2]))


@pytest.fixture(scope="session")
def server_module():
    return importlib.import_module("app.server")


@pytest.fixture(scope="session")
def client(server_module):
    from fastapi.testclient import TestClient

    return TestClient(server_module.app)


# ─── Registry shape ──────────────────────────────────────────────────────


def test_tools_registry_is_populated(server_module) -> None:
    assert len(server_module.TOOLS) >= 30


def test_every_tool_has_name_method_path(server_module) -> None:
    for tool in server_module.TOOLS:
        assert tool.get("name"), f"missing name: {tool}"
        assert tool.get("method") in {"GET", "POST", "PUT", "PATCH", "DELETE"}, f"bad method: {tool}"
        assert tool.get("path", "").startswith("/"), f"bad path: {tool}"


def test_tool_names_are_unique(server_module) -> None:
    names = [t["name"] for t in server_module.TOOLS]
    duplicates = [n for n in names if names.count(n) > 1]
    assert not duplicates, f"duplicates: {duplicates}"


def test_mail_core_tools_are_registered(server_module) -> None:
    names = {t["name"] for t in server_module.TOOLS}
    required = {
        "login", "logout", "get_me",
        "list_folders", "create_folder",
        "list_messages", "get_message", "create_message",
        "reply_message", "forward_message",
        "list_conversations", "get_conversation",
        "list_events", "create_event", "get_availability",
        "list_contacts", "list_task_lists", "list_tasks",
        "list_groups", "evaluate_dlp",
        "get_settings", "get_quota",
    }
    missing = required - names
    assert not missing, f"missing core tools: {sorted(missing)}"


# ─── HTTP smoke ──────────────────────────────────────────────────────────


def test_health_endpoint(client) -> None:
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body.get("status") in {"healthy", "ok", "ready"} or "status" in body


def test_tools_http_endpoint_returns_registry(client, server_module) -> None:
    res = client.get("/tools")
    assert res.status_code == 200
    body = res.json()
    assert "tools" in body
    assert len(body["tools"]) == len(server_module.TOOLS)
    for tool in body["tools"]:
        assert "name" in tool
        assert "description" in tool
        assert "input_schema" in tool


def test_step_endpoint_dispatches_unknown_tool(client) -> None:
    res = client.post("/step", json={"action": {"tool_name": "totally_not_a_tool", "parameters": {}}})
    assert res.status_code == 404


def test_call_tool_rejects_unknown(server_module) -> None:
    with pytest.raises(ValueError):
        server_module.call_tool("not_a_real_tool", {})


# ─── §2 security: /rl/reset must be gated ───────────────────────────────


def test_rl_reset_rejected_without_env_var(client) -> None:
    # Ensure env var is unset for this assertion
    saved = os.environ.pop("RL_RESET_TOKEN", None)
    try:
        res = client.post("/reset")
        assert res.status_code == 403
        assert "rl_reset_disabled" in res.text or "rl_reset_forbidden" in res.text
    finally:
        if saved is not None:
            os.environ["RL_RESET_TOKEN"] = saved


def test_rl_reset_rejected_with_wrong_token(client) -> None:
    os.environ["RL_RESET_TOKEN"] = "expected-secret-XYZ"
    try:
        res = client.post("/reset", headers={"X-Reset-Token": "wrong-secret"})
        assert res.status_code == 403
        assert "rl_reset_forbidden" in res.text
    finally:
        os.environ.pop("RL_RESET_TOKEN", None)


def test_rl_reset_rejected_without_token_header(client) -> None:
    os.environ["RL_RESET_TOKEN"] = "expected-secret-XYZ"
    try:
        res = client.post("/reset")  # no header
        assert res.status_code == 403
    finally:
        os.environ.pop("RL_RESET_TOKEN", None)
