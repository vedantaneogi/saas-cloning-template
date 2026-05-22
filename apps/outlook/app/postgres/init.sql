-- Outlook clone — declarative database schema.
--
-- This file is baked into the postgres image by `dockerfiles/Dockerfile.postgres`
-- and executed once when the container's data volume is empty.
--
-- Phase 1: placeholder DDL. The legacy app currently provisions its
-- schema via `Base.metadata.create_all` at FastAPI startup + alembic
-- migrations stored under `apps/api/alembic/versions/`. Phase 2 replaces
-- this file with the consolidated `pg_dump --schema-only` of the final
-- alembic head so the §1 acceptance criterion is met without runtime
-- create_all magic.
--
-- For now we declare ENUMs + the smallest baseline tables so a fresh
-- postgres container can serve `/health` without crashing. The legacy
-- create_all migration on startup will top up everything missing.

-- ─── ENUM types ─────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM ('worker', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_importance_enum AS ENUM ('low', 'normal', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_sensitivity_enum AS ENUM ('normal', 'personal', 'private', 'confidential');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_encrypt_mode_enum AS ENUM (
    'none',
    'company_confidential',
    'company_confidential_view_only',
    'do_not_forward',
    'encrypt_only'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── Baseline tables ────────────────────────────────────────────────────
-- These are the smallest set of tables required for `/health` to return
-- before SQLAlchemy's create_all fills in the rest. They mirror the
-- alembic `a846ec540c54_initial` migration head.

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY,
  email           VARCHAR(320) UNIQUE NOT NULL,
  display_name    VARCHAR(255),
  avatar_url      TEXT,
  timezone        VARCHAR(64) DEFAULT 'UTC',
  locale          VARCHAR(16) DEFAULT 'en-US',
  role            user_role_enum DEFAULT 'worker',
  hashed_password VARCHAR(255) NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS folders (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(64),
  parent_id   UUID REFERENCES folders(id) ON DELETE CASCADE,
  is_system   BOOLEAN DEFAULT FALSE,
  icon        VARCHAR(64),
  sort_order  INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject         TEXT,
  last_message_at TIMESTAMPTZ,
  message_count   INTEGER DEFAULT 0,
  has_attachments BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- The rest of the schema (messages, attachments, events, contacts,
-- tasks, groups, etc.) is created on first FastAPI startup by
-- `Base.metadata.create_all` against this same database. Phase 2
-- inlines them here so the image is self-sufficient.
