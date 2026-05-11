# syntax=docker/dockerfile:1.9
# Build context is the repo root (D:\techbrig\Linear), matching the rest of the project.

############################
# Stage 1 — builder
############################
FROM ghcr.io/astral-sh/uv:0.5-python3.12-bookworm-slim AS builder

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv

WORKDIR /app

# Install dependencies first so this layer is cached unless pyproject/uv.lock change.
COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# Now copy the app source and install the project itself into the venv.
COPY apps/api/ ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev


############################
# Stage 2 — runtime
############################
FROM python:3.12-slim-bookworm AS runtime

WORKDIR /app

COPY --from=builder /app /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
