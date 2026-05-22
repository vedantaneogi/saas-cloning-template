#!/usr/bin/env bash
set -euo pipefail

echo "=== Outlook Clone — Universal Acceptance Validation ==="

errors=0

check() {
  if [ ! -e "$1" ]; then
    echo "FAIL: Missing $1"
    errors=$((errors + 1))
  else
    echo "  OK: $1"
  fi
}

cd "$(dirname "$0")/.."

echo ""
echo "--- Required files (§1) ---"
check "app/server.py"
check "app/models.py"
check "app/schema.py"
check "app/postgres/init.sql"
check "app/seed/seed_app.py"
check "app/frontend/package.json"
check "app/frontend/src/App.tsx"
check "app/frontend/src/design-tokens.css"
check "app/tests/test_tools.py"
check "FEATURES.md"
check "docker-compose.dev.yml"

echo ""
echo "--- Seed data ---"
seed_files=$(find app/seed_data -name '*.json' 2>/dev/null | wc -l | tr -d ' ')
if [ "$seed_files" -eq "0" ]; then
  echo "FAIL: No seed data JSON files in app/seed_data/"
  errors=$((errors + 1))
else
  echo "  OK: $seed_files seed data file(s) found"
fi

echo ""
echo "--- Frontend pages ---"
page_files=$(find app/frontend/src/pages -name '*.tsx' 2>/dev/null | wc -l | tr -d ' ')
if [ "$page_files" -lt "2" ]; then
  echo "FAIL: Expected at least 2 page components, found $page_files"
  errors=$((errors + 1))
else
  echo "  OK: $page_files page component(s) found"
fi

echo ""
echo "--- Tool count ---"
if command -v python3 &>/dev/null; then
  tool_count=$(python3 -c "
import sys
try:
    with open('app/server.py') as f:
        source = f.read()
    if 'TOOLS' in source:
        count = source.count('\"name\"')
        print(count)
    else:
        print(0)
except Exception:
    print(0)
  ")
  if [ "$tool_count" -lt "2" ]; then
    echo "WARN: Only $tool_count tools defined in server.py (expected 30-50 for production)"
  else
    echo "  OK: $tool_count tools defined"
  fi
fi

echo ""
echo "--- Security audit (§2) ---"

# §2: no public POST /reset without auth gate
if grep -rE '@(app|router)\.post\("/reset"|@(app|router)\.post\("/rl/reset"' app/ 2>/dev/null \
  | grep -v 'RL_RESET_TOKEN' \
  | grep -v 'X-Reset-Token' \
  | grep -v 'require_reset_token' \
  > /tmp/outlook-validate-reset.tmp; then
  if [ -s /tmp/outlook-validate-reset.tmp ]; then
    # Endpoint exists — verify the token gate is present somewhere in app/
    if grep -rE 'RL_RESET_TOKEN|require_reset_token|X-Reset-Token' app/ >/dev/null 2>&1; then
      echo "  OK: /reset endpoint is gated by RL_RESET_TOKEN"
    else
      echo "FAIL: /reset endpoint exists without token gate"
      errors=$((errors + 1))
    fi
  fi
fi
rm -f /tmp/outlook-validate-reset.tmp

# §2: no string-concat SQL
if grep -rnE 'f"(SELECT|INSERT|UPDATE|DELETE) ' app/ 2>/dev/null | head -1; then
  echo "FAIL: f-string SQL found above"
  errors=$((errors + 1))
else
  echo "  OK: no f-string SQL"
fi

# §2: no leaked personal paths
if grep -rnE '/(Users|home/[a-zA-Z]+)/' app/ 2>/dev/null \
    | grep -v node_modules | grep -v '.venv' | grep -v '__pycache__' \
    | head -1; then
  echo "FAIL: leaked personal paths above"
  errors=$((errors + 1))
else
  echo "  OK: no leaked personal paths"
fi

echo ""
if [ "$errors" -gt "0" ]; then
  echo "FAILED: $errors validation error(s)"
  exit 1
else
  echo "PASSED: All checks passed"
fi
