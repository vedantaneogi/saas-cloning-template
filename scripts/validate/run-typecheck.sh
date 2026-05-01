#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "======================================================="
echo "  Validate — TypeScript typecheck"
echo "======================================================="
echo ""

cd apps/web
npx tsc --noEmit
echo "  ✅ TypeScript typecheck passed"
