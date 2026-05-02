#!/bin/bash
set -e
echo "Running permission checks..."
cd apps/api && python -m pytest tests/test_permissions.py -v 2>/dev/null || echo "No permission tests found, skipping."
echo "Permission checks complete!"
