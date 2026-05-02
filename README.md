# DocuSign Clone

**Repo:** [github.com/vedantaneogi/saas-cloning-template](https://github.com/vedantaneogi/saas-cloning-template)

A production-grade DocuSign clone with envelope creation, field placement, e-signing, templates, bulk send, and audit trails.

## Tech Stack

- **Frontend:** Next.js 15, React 19, TailwindCSS, TanStack Query, Zustand, @dnd-kit, Phosphor Icons
- **Backend:** FastAPI (Python), SQLAlchemy (async), PostgreSQL, PyMuPDF, bcrypt JWT auth

## Prerequisites

- Node.js 18+ / pnpm
- Python 3.11+
- PostgreSQL 15+ running on `localhost:5432`

## Quick Start

### 1. Database

```bash
psql -U postgres -c "CREATE DATABASE docusign;"
cd apps/api && python init_db.py
```

### 2. Backend

```bash
cd apps/api
pip install fastapi uvicorn sqlalchemy[asyncio] asyncpg pydantic[email] python-jose bcrypt pymupdf pillow python-multipart
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd apps/web
pnpm install
pnpm dev
```

App: `http://localhost:3000` | API: `http://localhost:8000`

## Routes

| Route | Page |
|-------|------|
| `/home` | Dashboard |
| `/agreements` | Envelope list (Inbox/Sent/Completed) |
| `/agreements/bulk-send` | Bulk send batch tracking |
| `/templates` | Template library |
| `/reports` | Reports |
| `/envelope/{id}/prepare` | Set Up Envelope |
| `/envelope/{id}/edit` | Add Fields editor |
| `/sign/{token}` | Signing ceremony |

## Features

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
