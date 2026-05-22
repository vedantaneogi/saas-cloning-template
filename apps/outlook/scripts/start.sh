#!/usr/bin/env bash
# Start the outlook clone stack.
#
# Default                 → postgres + clone-app + caddy. App reachable at:
#                             http://localhost:${APP_PORT}            (legacy)
#                             https://${CLONE_DOMAIN}:${CADDY_HOST_PORT}  (named, TLS)
# --without-https         → postgres + clone-app only (no caddy). App reachable at:
#                             http://localhost:${APP_PORT}
#
# Config:
#   apps/outlook/.env        (gitignored; copy from .env.example)
#   apps/outlook/.env.example

set -euo pipefail

WITH_HTTPS=true
EXTRA_ARGS=()
for arg in "$@"; do
    case "$arg" in
        --without-https) WITH_HTTPS=false ;;
        --with-https)    WITH_HTTPS=true ;;
        -h|--help)
            sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *) EXTRA_ARGS+=("$arg") ;;
    esac
done

# Locate this script's app directory regardless of where it was invoked from.
HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"

# Source .env if present (Compose auto-loads it too, but the script
# needs the values for the curl wait below).
if [[ -f .env ]]; then
    set -a; source .env; set +a
elif [[ -f .env.example ]]; then
    set -a; source .env.example; set +a
fi

: "${APP_PORT:=8045}"
: "${DB_PORT:=5445}"
: "${CLONE_DOMAIN:=outlook.clone.test}"
: "${CADDY_HOST_PORT:=443}"

REPO_ROOT="$(cd "$HERE/../.." && pwd)"
# Shared TLS / caddy gateway lives at packages/clone-tls/ in the
# `collinear-apps/app-clones` monorepo. In this fork we may not have it yet —
# scripts/start.sh tolerates a missing CA + skips host-mod actions when the
# gateway isn't present.
CA="$REPO_ROOT/packages/clone-tls/ca/root.crt"

ensure_host_setup() {
    if [[ ! -d "$REPO_ROOT/packages/clone-tls" ]]; then
        echo "[start] packages/clone-tls/ not present in this repo; skipping shared-caddy setup."
        WITH_HTTPS=false
        return
    fi

    if ! grep -qF "$CLONE_DOMAIN" /etc/hosts 2>/dev/null; then
        echo "[start] '$CLONE_DOMAIN' missing from /etc/hosts — running install-hosts.sh (sudo)"
        "$REPO_ROOT/packages/clone-tls/scripts/install-hosts.sh"
    fi

    local trusted=0
    case "$(uname -s)" in
        Darwin)
            if security find-certificate -c "Clone Apps Local CA" \
                 /Library/Keychains/System.keychain >/dev/null 2>&1; then
                trusted=1
            fi
            ;;
        Linux)
            if [[ -f /usr/local/share/ca-certificates/clone-apps-local-ca.crt \
                || -f /etc/pki/ca-trust/source/anchors/clone-apps-local-ca.crt ]]; then
                trusted=1
            fi
            ;;
    esac

    if [[ "$trusted" -eq 0 ]]; then
        echo "[start] CA not trusted system-wide — running trust-ca.sh (sudo)"
        "$REPO_ROOT/packages/clone-tls/scripts/trust-ca.sh"
    fi
}

if [[ "$WITH_HTTPS" == "true" ]]; then
    echo "[start] mode: HTTPS (shared caddy) + legacy localhost"
    ensure_host_setup
fi

# In `WITH_HTTPS` mode we still tolerate a missing clone-tls package, falling
# back to localhost-only just like `--without-https`.
if [[ "$WITH_HTTPS" == "true" ]] && [[ -d "$REPO_ROOT/packages/clone-tls" ]]; then
    "$REPO_ROOT/packages/clone-tls/scripts/ensure-shared.sh"
    docker compose -f docker-compose.dev.yml up --build -d ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}

    HTTPS_URL="https://${CLONE_DOMAIN}"
    echo "[start] waiting for ${HTTPS_URL}/health ..."
    deadline=$(( SECONDS + 90 ))
    until curl -sf --cacert "$CA" "${HTTPS_URL}/health" > /dev/null 2>&1; do
        if (( SECONDS > deadline )); then
            echo "[start] timed out after 90s waiting for the health endpoint" >&2
            docker compose -f docker-compose.dev.yml logs --tail 30 >&2
            exit 1
        fi
        sleep 1
    done
    echo "[start] ready:"
    echo "  ${HTTPS_URL}     (TLS, via shared caddy)"
    echo "  http://localhost:${APP_PORT}     (legacy, direct)"
else
    echo "[start] mode: localhost only (no caddy, no TLS)"
    docker compose -f docker-compose.dev.yml up --build -d postgres clone-app ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}

    echo "[start] waiting for http://localhost:${APP_PORT}/health ..."
    deadline=$(( SECONDS + 90 ))
    until curl -sf "http://localhost:${APP_PORT}/health" > /dev/null 2>&1; do
        if (( SECONDS > deadline )); then
            echo "[start] timed out after 90s waiting for http://localhost:${APP_PORT}/health" >&2
            docker compose -f docker-compose.dev.yml logs --tail 30 >&2
            exit 1
        fi
        sleep 1
    done
    echo "[start] ready:"
    echo "  http://localhost:${APP_PORT}"
fi
