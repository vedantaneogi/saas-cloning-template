FROM python:3.12-slim
WORKDIR /app

# Install build dependencies for psycopg/asyncpg native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml first for better layer caching
COPY apps/api/pyproject.toml /app/pyproject.toml

# Install all project dependencies from pyproject.toml
RUN pip install --no-cache-dir "fastapi>=0.111.0" "uvicorn[standard]>=0.29.0" \
    "sqlalchemy[asyncio]>=2.0.0" "asyncpg>=0.29.0" "alembic>=1.13.0" \
    "pydantic[email]>=2.7.0" "pydantic-settings>=2.2.0" \
    "python-jose[cryptography]>=3.3.0" "passlib[bcrypt]>=1.7.4" \
    "python-multipart>=0.0.9" "aiofiles>=23.2.1" "greenlet>=3.0.0"

# Copy application source
COPY apps/api /app

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
