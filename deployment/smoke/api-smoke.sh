#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local status="$2"
  local expected="$3"
  if [ "$status" -eq "$expected" ]; then
    echo "[PASS] $name (HTTP $status)"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] $name — expected HTTP $expected, got $status"
    FAIL=$((FAIL + 1))
  fi
}

echo "Running API smoke tests against $API_URL"

# Health check
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
check "GET /health" "$STATUS" 200

# Auth endpoints exist (expect redirect or 422, not 404/500)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/auth/login")
check "GET /auth/login (redirect)" "$STATUS" 307

# Protected endpoint without token → 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/auth/me")
check "GET /auth/me (no token → 401)" "$STATUS" 401

# Presentations list without token → 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/presentations")
check "GET /presentations (no token → 401)" "$STATUS" 401

# Create presentation without token → 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"title":"smoke test"}' \
  "$API_URL/presentations")
check "POST /presentations (no token → 401)" "$STATUS" 401

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
