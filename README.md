# DocuSign Clone

**Repo:** [github.com/vedantaneogi/saas-cloning-template](https://github.com/vedantaneogi/saas-cloning-template)

A production-grade DocuSign clone with envelope creation, field placement, e-signing, templates, bulk send, and audit trails.

## Tech Stack

- **Frontend:** Next.js 15, React 19, TailwindCSS, TanStack Query, Zustand, @dnd-kit, Phosphor Icons
- **Backend:** FastAPI (Python), SQLAlchemy (async), PostgreSQL, PyMuPDF, bcrypt JWT auth

---

## Option 1: Run with Docker (Recommended)

### Prerequisites
- Docker + Docker Compose

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/vedantaneogi/saas-cloning-template.git
cd saas-cloning-template
git checkout docusign-clone

# 2. Copy environment file
cp .env.example .env

# 3. Build and run
docker compose up --build
```

App: `http://localhost:3000` | API: `http://localhost:8000`

First user: sign up at `http://localhost:3000/sign-up`

---

## Option 2: Run Locally (Without Docker)

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Python 3.11+
- PostgreSQL 15+ running on `localhost:5432`

### 1. Clone & setup environment

```bash
git clone https://github.com/vedantaneogi/saas-cloning-template.git
cd saas-cloning-template
git checkout docusign-clone
```

### 2. Database

```bash
# Start PostgreSQL (if not running)
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql
# Docker: docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine

# Create the database
PGPASSWORD=postgres psql -h localhost -U postgres -p 5432 -c "CREATE DATABASE docusign;"
# NOTE: If your Postgres runs on a different port (e.g. 5433), use -p 5433 and update DATABASE_URL below
```

### 3. Backend

```bash
cd apps/api

# Create .env file (adjust port if your Postgres is not on 5432)
cat > .env << 'EOF'
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/docusign
SECRET_KEY=dev-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=10080
TEST_AUTH_ENABLED=true
UPLOAD_DIR=./uploads
CORS_ORIGINS=http://localhost:3000
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
EOF

# Install Python dependencies
pip install -e .
# If you get "externally managed" error, use: pip install --break-system-packages -e .

# Initialize database tables (reads DATABASE_URL from .env)
python3 init_db.py

# Create uploads directory
mkdir -p uploads

# Start API server
uvicorn app.main:app --reload --port 8000
```

API health check: `curl http://localhost:8000/health` should return `{"status":"ok"}`

### 4. Frontend (new terminal)

```bash
cd apps/web

# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

App: `http://localhost:3000`

### 5. First use

1. Open `http://localhost:3000`
2. Click "Sign Up" — create an account
3. You're in! Click "Get Signatures" to create your first envelope

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `psql: connection refused` | PostgreSQL not running. Start it: `brew services start postgresql` (Mac) or `sudo systemctl start postgresql` (Linux) |
| `pip install` fails | Use `pip install -e ".[dev]"` or install deps one by one from `pyproject.toml` |
| `pnpm install` fails | Make sure pnpm is installed: `npm install -g pnpm` |
| API returns 500 | Check `.env` file exists in `apps/api/` with correct `DATABASE_URL` |
| Login fails after restart | Cookie domain mismatch. Ensure `COOKIE_DOMAIN=localhost` in `.env` |
| Docker build fails | Run `docker compose down -v` then `docker compose up --build` |

---

## Routes

| Route | Page |
|-------|------|
| `/` | Landing page |
| `/sign-up` | Create account |
| `/sign-in` | Login |
| `/home` | Dashboard |
| `/agreements` | Envelope list (Inbox/Sent/Completed) |
| `/agreements/bulk-send` | Bulk send batch tracking |
| `/templates` | Template library |
| `/reports` | Reports |
| `/envelope/{id}/prepare` | Set Up Envelope |
| `/envelope/{id}/edit` | Add Fields editor |
| `/sign/{token}` | Signing ceremony |

## Features

- JWT cookie auth (httponly, 7-day expiry)
- PDF/DOCX/DOC upload + page rendering
- 19 drag-and-drop field types (signature, initial, date, text, checkbox, etc.)
- Multi-recipient with routing order
- E-record consent + signature capture (type/draw/upload)
- Bulk send via CSV
- Template library with search/favorites
- Envelope lifecycle (draft → sent → completed/voided/declined)
- Signed PDF download + audit trail certificate
- Comments, access codes, reminders, expiration
- Resend, void, correct in-flight
