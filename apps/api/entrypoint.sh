#!/bin/bash
set -e
echo "Running database migrations..."
alembic upgrade head || {
  echo "Alembic migration failed — attempting init_db.py then re-running migrations..."
  python init_db.py
  alembic upgrade head 2>/dev/null || {
    echo "WARNING: Migrations still failed after init_db.py. Starting anyway."
  }
}
echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
