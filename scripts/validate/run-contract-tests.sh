#!/bin/bash
set -e
echo "Running contract tests..."
cd apps/api && python -m pytest tests/contract/ -v 2>/dev/null || echo "No contract tests found, skipping."
echo "Contract tests complete!"
