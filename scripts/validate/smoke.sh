#!/bin/bash
set -e
echo "Running smoke tests..."

# Check API health
curl -sf http://localhost:8000/health > /dev/null && echo "API healthy" || echo "API down"

# Check web
curl -sf http://localhost:3000 > /dev/null && echo "Web healthy" || echo "Web down"

# Check Caddy proxy
curl -sf http://localhost/api/health > /dev/null && echo "Caddy proxy healthy" || echo "Caddy down"

echo "Smoke tests complete!"
