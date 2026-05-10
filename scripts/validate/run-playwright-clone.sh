#!/bin/bash
set -e
echo "Running Playwright E2E tests..."
cd apps/web && npx playwright test
echo "Playwright tests passed!"
