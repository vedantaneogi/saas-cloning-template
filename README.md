# Outlook Clone

A full-featured Microsoft Outlook clone built with Next.js 15, FastAPI, and PostgreSQL.

---

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [pnpm 10+](https://pnpm.io/installation) — this project uses pnpm workspaces, not npm
- [Python 3.11+](https://www.python.org/)
- [PostgreSQL 16+](https://www.postgresql.org/) running locally on port 5432

> **Windows users:** During PostgreSQL installation set the `postgres` superuser password to `postgres` and keep the default port 5432. After installing, open a new terminal so `psql` is on your PATH.

---

## Quick Start

### 1. Clone the repo & checkout the branch

```bash
git clone https://github.com/vedantaneogi/saas-cloning-template.git
cd saas-cloning-template
git checkout outlook-clone
```

### 2. Install pnpm (if not already installed)

```bash
npm install -g pnpm@10
```

### 3. Backend — FastAPI (port 8000)

```bash
cd apps/api

# Install Python dependencies
pip install fastapi "uvicorn[standard]" "sqlalchemy[asyncio]" asyncpg alembic \
  "pydantic[email]" pydantic-settings "python-jose[cryptography]" \
  "passlib[bcrypt]" python-multipart aiofiles greenlet
```

Create the database (run this from any terminal):

```bash
# macOS / Linux
psql -U postgres -h localhost -c "CREATE DATABASE outlook_clone;"

# Windows (PowerShell) — pass password via env var to avoid interactive prompt
$env:PGPASSWORD = "postgres"
psql -U postgres -h localhost -c "CREATE DATABASE outlook_clone;"
```

Run migrations and start the server:

```bash
# still inside apps/api
alembic upgrade head

uvicorn app.main:app --reload --port 8000
```

### 4. Seed demo data

With the API running, open a **new terminal** at the repo root and run:

```bash
# macOS / Linux
curl -X POST http://localhost:8000/seed \
  -H "Content-Type: application/json" \
  -d @apps/api/seeds/seed-default.json

# Windows (PowerShell)
curl.exe -X POST http://localhost:8000/seed `
  -H "Content-Type: application/json" `
  -d "@apps/api/seeds/seed-default.json"
```

### 5. Frontend — Next.js (port 3000)

Open another new terminal:

```bash
cd apps/web

pnpm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=/api/v1" > .env.local

# Build and start
pnpm run build
pnpm run start
```

### 6. Open the app

Go to [http://localhost:3000](http://localhost:3000) and sign in:

| Field    | Value                       |
|----------|-----------------------------|
| Email    | `frank.miller@acmecorp.com` |
| Password | `password123`               |

---

## Tech Stack

| Layer    | Technology                                     |
|----------|------------------------------------------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend  | FastAPI, SQLAlchemy 2.0 (async), Alembic       |
| Database | PostgreSQL 16+                                 |
| Auth     | JWT (python-jose + passlib)                    |
| State    | Zustand + TanStack Query                       |

---

## Features

- **Mail** — inbox, folders, compose, reply, forward, categories, rules, snooze, scheduled send, drag-to-folder
- **Calendar** — month/week/day views, recurring events, RSVP, event scope (single vs series)
- **Contacts** — create, edit, delete, search, favorites
- **Tasks** — task lists, create/complete/delete tasks
- **Settings** — categories, rules with priority reordering, email signatures

---

## Troubleshooting

**`next` command not found / build fails with npm**
This project uses pnpm workspaces. Run `pnpm install` instead of `npm install` in `apps/web`.

**`psql` not found on Windows**
Add the PostgreSQL bin directory to your PATH, e.g. `C:\Program Files\PostgreSQL\17\bin`, then open a new terminal.

**`alembic upgrade head` fails with connection error**
Make sure PostgreSQL is running and the `outlook_clone` database was created. The connection string is `postgresql+asyncpg://postgres:postgres@localhost:5432/outlook_clone` (set in `apps/api/alembic.ini`).

**Seed fails with "column does not exist" error**
Your migration may be out of date. Run `alembic upgrade head` again from `apps/api` after pulling the latest code.

---

## Reset / Re-seed

To wipe all data and start fresh:

```bash
curl -X POST http://localhost:8000/api/v1/reset \
  -H "Content-Type: application/json" \
  -d '{"scenario": "default"}'
```

Available scenarios: `default`, `minimal`, `heavy`
