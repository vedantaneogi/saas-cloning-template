#!/bin/bash
set -e
echo "Running Python tests..."
cd apps/api && python -m pytest -v
echo "Python tests passed!"
