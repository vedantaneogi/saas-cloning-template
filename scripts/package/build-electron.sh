#!/bin/bash
set -e
echo "Building Electron desktop app..."
cd apps/desktop
pnpm install
pnpm build
pnpm make
echo "Electron build complete! Artifacts in apps/desktop/out/"
