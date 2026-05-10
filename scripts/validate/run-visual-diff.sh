#!/bin/bash
set -e
echo "Running visual diff tests..."
cd apps/web && npx playwright test --project=visual-diff
echo "Visual diff tests complete!"
