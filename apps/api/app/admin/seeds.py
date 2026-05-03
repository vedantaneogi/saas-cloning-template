"""Canned fixture data for POST /admin/seed.

The Deck content shape mirrors the TypeScript types at
apps/web/src/features/editor/model/types.ts (Deck, Slide, SlideElement).
Documented in docs/jsonb-content-schema.md.

The first seeded user uses TEST_AUTH_EMAIL / TEST_AUTH_NAME and the same
google_id format as POST /auth/test-login, so signing in via the test-login
button lands on this user and immediately sees the seeded decks.
"""
from typing import Any

from app.core.config import get_settings

BOB_EMAIL = "bob@grader.local"


def _alice_email() -> str:
    return get_settings().test_auth_email


def build_seed_users() -> list[dict[str, Any]]:
    settings = get_settings()
    return [
        {
            "google_id": f"test-auth|{settings.test_auth_email}",
            "email": settings.test_auth_email,
            "name": settings.test_auth_name,
            "picture": None,
        },
        {
            "google_id": "seed|bob@grader.local",
            "email": BOB_EMAIL,
            "name": "Bob Grader",
            "picture": None,
        },
    ]


def _meta(title: str) -> dict[str, Any]:
    return {
        "title": title,
        "themeId": "default",
        "pageWidth": 960,
        "pageHeight": 540,
        "schemaVersion": 1,
    }


def _deck_a_content() -> dict[str, Any]:
    return {
        "id": "",
        "meta": _meta("Q3 Roadmap"),
        "slides": [
            {
                "id": "slide-a-1",
                "layoutId": "title",
                "background": {"kind": "theme"},
                "elements": [
                    {
                        "id": "el-a1-title",
                        "type": "text",
                        "x": 80, "y": 170, "w": 800, "h": 130, "z": 1,
                        "text": {
                            "align": "center",
                            "fontSize": 48,
                            "fontFamily": "Inter",
                            "color": "#202124",
                            "placeholder": "Click to add title",
                            "initialHtml": "<p>Q3 Roadmap</p>",
                        },
                    },
                    {
                        "id": "el-a1-subtitle",
                        "type": "text",
                        "x": 80, "y": 330, "w": 800, "h": 60, "z": 2,
                        "text": {
                            "align": "center",
                            "fontSize": 22,
                            "color": "#5f6368",
                            "initialHtml": "<p>What ships and when</p>",
                        },
                    },
                ],
            },
            {
                "id": "slide-a-2",
                "layoutId": "blank",
                "background": {"kind": "solid", "color": "#ffffff"},
                "elements": [
                    {
                        "id": "el-a2-heading",
                        "type": "text",
                        "x": 60, "y": 40, "w": 840, "h": 60, "z": 1,
                        "text": {
                            "align": "left",
                            "fontSize": 32,
                            "color": "#202124",
                            "initialHtml": "<p>Highlights</p>",
                        },
                    },
                    {
                        "id": "el-a2-rect",
                        "type": "shape",
                        "x": 80, "y": 140, "w": 360, "h": 200, "z": 2,
                        "shape": "rect",
                        "fill": "#1a73e8",
                        "stroke": "#0b57d0",
                        "strokeWidth": 2,
                        "radius": 12,
                        "text": {
                            "align": "center",
                            "fontSize": 20,
                            "color": "#ffffff",
                            "initialHtml": "<p>Ship v2 editor</p>",
                        },
                    },
                    {
                        "id": "el-a2-ellipse",
                        "type": "shape",
                        "x": 520, "y": 160, "w": 220, "h": 220, "z": 3,
                        "shape": "ellipse",
                        "fill": "#fbbc04",
                        "stroke": "#f29900",
                        "strokeWidth": 2,
                    },
                    {
                        "id": "el-a2-image",
                        "type": "image",
                        "x": 60, "y": 380, "w": 200, "h": 120, "z": 4,
                        "src": "https://placehold.co/400x240/png",
                        "alt": "Placeholder roadmap diagram",
                        "crop": {"x": 0, "y": 0, "w": 1, "h": 1},
                    },
                ],
            },
        ],
    }


def _deck_b_content() -> dict[str, Any]:
    cells = []
    headers = ["Quarter", "Bookings", "Revenue"]
    rows = [
        ["Q1", "$1.2M", "$0.8M"],
        ["Q2", "$1.6M", "$1.1M"],
        ["Q3", "$2.1M", "$1.5M"],
    ]
    for col_idx, header in enumerate(headers):
        cells.append({
            "id": f"cell-h-{col_idx}",
            "row": 0,
            "col": col_idx,
            "contentJson": {
                "type": "doc",
                "content": [{"type": "paragraph", "content": [
                    {"type": "text", "text": header}
                ]}],
            },
        })
    for row_idx, row in enumerate(rows, start=1):
        for col_idx, value in enumerate(row):
            cells.append({
                "id": f"cell-{row_idx}-{col_idx}",
                "row": row_idx,
                "col": col_idx,
                "contentJson": {
                    "type": "doc",
                    "content": [{"type": "paragraph", "content": [
                        {"type": "text", "text": value}
                    ]}],
                },
            })

    return {
        "id": "",
        "meta": _meta("Quarterly Numbers"),
        "slides": [
            {
                "id": "slide-b-1",
                "layoutId": "blank",
                "background": {"kind": "solid", "color": "#f8f9fa"},
                "elements": [
                    {
                        "id": "el-b1-title",
                        "type": "text",
                        "x": 60, "y": 40, "w": 840, "h": 60, "z": 1,
                        "text": {
                            "align": "left",
                            "fontSize": 32,
                            "color": "#202124",
                            "initialHtml": "<p>Quarterly Numbers</p>",
                        },
                    },
                    {
                        "id": "el-b1-table",
                        "type": "table",
                        "x": 60, "y": 140, "w": 840, "h": 320, "z": 2,
                        "rows": 4,
                        "cols": 3,
                        "colRatios": [0.34, 0.33, 0.33],
                        "rowRatios": [0.25, 0.25, 0.25, 0.25],
                        "cells": cells,
                        "style": {
                            "headerEnabled": True,
                            "headerFill": "#1a73e8",
                            "headerBold": True,
                            "zebraEnabled": True,
                            "zebraFill": "#e8f0fe",
                            "borderColor": "#dadce0",
                            "borderWidth": 1,
                            "tableFill": "#ffffff",
                        },
                    },
                ],
            },
        ],
    }


def _deck_c_content() -> dict[str, Any]:
    return {
        "id": "",
        "meta": _meta("Marketing Mix"),
        "slides": [
            {
                "id": "slide-c-1",
                "layoutId": "blank",
                "background": {
                    "kind": "image",
                    "src": "https://placehold.co/960x540/png",
                },
                "elements": [
                    {
                        "id": "el-c1-title",
                        "type": "text",
                        "x": 60, "y": 40, "w": 840, "h": 60, "z": 1,
                        "text": {
                            "align": "left",
                            "fontSize": 32,
                            "color": "#ffffff",
                            "initialHtml": "<p>Channel Mix</p>",
                        },
                    },
                    {
                        "id": "el-c1-pie",
                        "type": "chart",
                        "x": 120, "y": 140, "w": 720, "h": 360, "z": 2,
                        "chartKind": "pie",
                        "data": [
                            {"id": "p-1", "label": "Organic", "value": 42},
                            {"id": "p-2", "label": "Paid",    "value": 28},
                            {"id": "p-3", "label": "Referral","value": 18},
                            {"id": "p-4", "label": "Email",   "value": 12},
                        ],
                        "style": {
                            "colors": ["#1a73e8", "#fbbc04", "#34a853", "#ea4335"],
                            "showLegend": True,
                            "showValues": True,
                            "title": "Acquisition share",
                        },
                    },
                ],
            },
            {
                "id": "slide-c-2",
                "layoutId": "blank",
                "background": {"kind": "solid", "color": "#ffffff"},
                "elements": [
                    {
                        "id": "el-c2-bar",
                        "type": "chart",
                        "x": 80, "y": 80, "w": 800, "h": 380, "z": 1,
                        "chartKind": "bar",
                        "data": [
                            {"id": "b-1", "label": "Jan", "value": 120},
                            {"id": "b-2", "label": "Feb", "value": 165},
                            {"id": "b-3", "label": "Mar", "value": 210},
                            {"id": "b-4", "label": "Apr", "value": 188},
                        ],
                        "style": {
                            "colors": ["#1a73e8"],
                            "showLegend": False,
                            "showValues": True,
                            "orientation": "vertical",
                            "title": "Monthly signups",
                        },
                    },
                ],
            },
        ],
    }


def _deck_d_content() -> dict[str, Any]:
    return {
        "id": "",
        "meta": _meta("Welcome"),
        "slides": [
            {
                "id": "slide-d-1",
                "layoutId": "title",
                "background": {"kind": "theme"},
                "elements": [
                    {
                        "id": "el-d1-title",
                        "type": "text",
                        "x": 80, "y": 220, "w": 800, "h": 100, "z": 1,
                        "text": {
                            "align": "center",
                            "fontSize": 44,
                            "color": "#202124",
                            "initialHtml": "<p>Welcome to Slides</p>",
                        },
                    },
                ],
            },
        ],
    }


def build_seed_decks() -> list[dict[str, Any]]:
    """Returns deck specs in the order they should be created. The first deck
    is treated as 'Deck A' for collaborator + version snapshot wiring."""
    return [
        {
            "owner_email": _alice_email(),
            "title": "Q3 Roadmap",
            "is_public": False,
            "content": _deck_a_content(),
        },
        {
            "owner_email": _alice_email(),
            "title": "Quarterly Numbers",
            "is_public": False,
            "content": _deck_b_content(),
        },
        {
            "owner_email": _alice_email(),
            "title": "Marketing Mix",
            "is_public": False,
            "content": _deck_c_content(),
        },
        {
            "owner_email": BOB_EMAIL,
            "title": "Welcome",
            "is_public": True,
            "content": _deck_d_content(),
        },
    ]
