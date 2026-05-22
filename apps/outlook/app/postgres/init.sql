-- Outlook clone — postgres init script.
--
-- Baked into the postgres image by dockerfiles/Dockerfile.postgres and
-- executed once when the container's data volume is empty.
--
-- We only declare ENUM types here. Tables are built at FastAPI startup
-- by `Base.metadata.create_all` from the live SQLAlchemy models in
-- `app/models/*.py`. That avoids drift between this file and the
-- model definitions during the migration — the previous version of
-- this script created a `users` table without the recently-added
-- `world_id` column, and `create_all` refused to ALTER it, which
-- broke every seeded login. Phase 2 inlines a pg_dump --schema-only
-- here once the model surface freezes.

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
