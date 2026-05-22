"""pytest entry — exercises the TOOLS registry contract.

Phase 1: smoke tests against the in-process server module. Phase 2 adds
a fixture that boots the FastAPI app + per-tool round-trips against the
live HTTP surface (matching `apps/github/app/tests/test_tools.py`).
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest


# Make `app.server` importable when pytest is invoked from `apps/outlook/app/`
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))


@pytest.fixture(scope="session")
def server_module():
    return importlib.import_module("app.server")


def test_tools_registry_is_populated(server_module) -> None:
    tools = server_module.TOOLS
    assert isinstance(tools, list)
    assert len(tools) >= 30, (
        f"Expected ≥30 tools for a production clone, found {len(tools)}"
    )


def test_every_tool_has_a_name_and_schema(server_module) -> None:
    for tool in server_module.TOOLS:
        assert "name" in tool, f"Tool missing 'name': {tool}"
        assert isinstance(tool["name"], str) and tool["name"], (
            f"Tool 'name' must be a non-empty string: {tool}"
        )
        assert "input_schema" in tool, (
            f"Tool {tool['name']!r} missing 'input_schema'"
        )


def test_tool_names_are_unique(server_module) -> None:
    names = [t["name"] for t in server_module.TOOLS]
    assert len(names) == len(set(names)), (
        f"Duplicate tool names in TOOLS: "
        f"{[n for n in names if names.count(n) > 1]}"
    )


def test_call_tool_dispatches_known(server_module) -> None:
    result = server_module.call_tool("get_me", {})
    assert isinstance(result, dict)
    assert result.get("tool") == "get_me"


def test_call_tool_rejects_unknown(server_module) -> None:
    with pytest.raises(ValueError):
        server_module.call_tool("not_a_real_tool", {})


def test_mail_core_tools_are_registered(server_module) -> None:
    names = {t["name"] for t in server_module.TOOLS}
    required = {
        "login",
        "logout",
        "get_me",
        "list_folders",
        "list_messages",
        "get_message",
        "create_message",
        "reply_message",
        "forward_message",
        "list_conversations",
        "get_conversation",
        "list_events",
        "create_event",
        "list_contacts",
        "list_task_lists",
        "list_groups",
        "evaluate_dlp",
    }
    missing = required - names
    assert not missing, f"Mail core tools missing from registry: {sorted(missing)}"
