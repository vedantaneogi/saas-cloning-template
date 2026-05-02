#!/bin/bash
set -e
echo "Running ESLint..."
cd apps/web && npx eslint src --ext .ts,.tsx
echo "ESLint passed!"
