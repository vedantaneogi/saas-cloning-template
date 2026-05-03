#!/bin/bash
set -e
echo "Running database migrations..."
alembic upgrade head || {
  echo "Alembic failed, trying init_db.py instead..."
  python init_db.py
  alembic stamp head 2>/dev/null || true
}
echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
