#!/bin/bash
set -e
echo "Running TypeScript type check..."
cd apps/web && npx tsc --noEmit
echo "TypeScript check passed!"
