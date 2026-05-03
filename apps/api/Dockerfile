# syntax=docker/dockerfile:1
FROM python:3.12-slim AS builder
WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY apps/api/pyproject.toml .
RUN pip install --no-cache-dir "fastapi>=0.111.0" "uvicorn[standard]>=0.29.0" \
    "sqlalchemy[asyncio]>=2.0.0" "asyncpg>=0.29.0" "alembic>=1.13.0" \
    "pydantic[email]>=2.7.0" "pydantic-settings>=2.2.0" \
    "python-jose[cryptography]>=3.3.0" "passlib[bcrypt]>=1.7.4" \
    "python-multipart>=0.0.9" "aiofiles>=23.2.1" "greenlet>=3.0.0" \
    "python-json-logger>=2.0.7"

FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libpq5 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY apps/api /app

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
