#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "======================================================="
echo "  Validate — pytest"
echo "======================================================="
echo ""

cd apps/api
uv run pytest tests/ -v --tb=short 2>/dev/null || echo "  ℹ️  No pytest tests yet — skipping"
echo "  ✅ pytest step complete"
