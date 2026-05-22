# Outlook Clone — Status

Snapshot of the migration from the legacy `apps/api/` + `apps/web/` split
into the universal-acceptance-criteria-compliant `apps/outlook/` layout.

| Phase | Description | State |
| ----- | ----------- | ----- |
| 1 | `apps/outlook/` shell — README, FEATURES, PORTS, Taskfile, scripts, dockerfiles, docker-compose.dev.yml, pyproject.toml | **In progress** |
| 2 | Backend port (`apps/api/app` → `apps/outlook/app`) + `TOOLS` registry + `init.sql` + `seed_app.py` + `tests/test_tools.py` | Pending |
| 3 | Frontend Vite migration (Next.js → Vite + React Router) | Pending |
| 4 | e2e scaffolding (fixtures, POMs, COVERAGE.md, specs, `.github/workflows/e2e-outlook.yml`) | Pending |
| 5 | Testid coverage sweep | Pending |
| 6 | Deploy + verify against acceptance criteria end-to-end | Pending |

## What's running where today

- Legacy stack — `apps/api/` (FastAPI) + `apps/web/` (Next.js 15) still
  builds and deploys via `scripts/deploy/e2b-deploy.mjs`. **No regression**
  — both stacks coexist during the migration.
- New stack — `apps/outlook/` is being populated. Once the new
  `task outlook:up` matches the legacy deploy feature-for-feature on a
  fresh E2B sandbox, the legacy directories will be removed.

## Open questions

- Final decision on the `cua/dev/apps.yml` + `cua/dev/ports.json` + `packages/clone-tls/`
  entries — these live in `collinear-apps/app-clones` and will be added
  when the work is ported across.

## Known carry-overs from the legacy stack

These behavioural notes survived the move and are documented for the
reviewer:

- **Conversation `_link_recipient_thread`** — at delivery time the
  backend walks the recipient's mailbox by normalized subject +
  sender↔recipient participation and converges every related row onto a
  single `conversation_id`. Required because seed data is one-sided and
  cross-mailbox replies otherwise sit on different ids on each side.
- **Boomerang reminder** — when a sent message goes unanswered past
  `boomerang_at`, the opportunistic helper drops a self-to-self message
  in the user's inbox flagged with `is_flagged=true is_pinned=true` and
  a body fingerprint `"Message moved to top of Inbox by Boomerang"`
  used by the frontend to render the yellow tray.
- **Compose draft auto-save on navigate** — clicking another message
  while a compose is open inline triggers the editor's
  `onSaveAndClose` callback so the in-flight draft is persisted before
  the reading pane is freed.
