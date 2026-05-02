# Outlook Clone

A full-featured Microsoft Outlook clone built with Next.js 15, FastAPI, and PostgreSQL.

---

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Python 3.11+](https://www.python.org/)
- [PostgreSQL 16](https://www.postgresql.org/) running locally

---

## Quick Start

### 1. Clone the repo & checkout the branch

```bash
git clone https://github.com/vedantaneogi/saas-cloning-template.git
cd saas-cloning-template
git checkout outlook-clone
```

### 2. Backend (FastAPI — port 8000)

```bash
cd apps/api

# Install Python dependencies
pip install fastapi "uvicorn[standard]" "sqlalchemy[asyncio]" asyncpg alembic \
  "pydantic[email]" pydantic-settings "python-jose[cryptography]" \
  "passlib[bcrypt]" python-multipart aiofiles greenlet

# Create the database — open a terminal and run:
# psql -U postgres -h localhost -c "CREATE DATABASE outlook_clone;"

# Run migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --port 8000
```

### 3. Seed demo data

With the API running, seed the database:

```bash
curl -X POST http://localhost:8000/seed \
  -H "Content-Type: application/json" \
  -d @apps/api/seeds/seed-default.json
```

### 4. Frontend (Next.js — port 3000)

Open a new terminal:

```bash
cd apps/web

npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=/api/v1" > .env.local

# Build and start
npm run build
npm run start
```

### 5. Open the app

Go to [http://localhost:3000](http://localhost:3000) and sign in:

| Field    | Value                        |
|----------|------------------------------|
| Email    | `frank.miller@acmecorp.com`  |
| Password | `password123`                |

---

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend   | FastAPI, SQLAlchemy 2.0 (async), Alembic |
| Database  | PostgreSQL 16                           |
| Auth      | JWT (python-jose + passlib)             |
| State     | Zustand + TanStack Query                |

---

## Features

- **Mail** — inbox, folders, compose, reply, forward, categories, rules, snooze, scheduled send, drag-to-folder
- **Calendar** — month/week/day views, recurring events, RSVP, event scope (single vs series)
- **Contacts** — create, edit, delete, search, favorites
- **Tasks** — task lists, create/complete/delete tasks
- **Settings** — categories, rules with priority reordering, email signatures

---

## Reset / Re-seed

To wipe all data and start fresh:

```bash
curl -X POST http://localhost:8000/api/v1/reset \
  -H "Content-Type: application/json" \
  -d '{"scenario": "default"}'
```

Available scenarios: `default`, `minimal`, `heavy`
