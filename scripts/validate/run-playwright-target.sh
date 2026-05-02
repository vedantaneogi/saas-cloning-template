#!/bin/bash
set -e
echo "Running Playwright target tests..."
cd apps/web && npx playwright test --project=target
echo "Playwright target tests passed!"
