# Outlook Clone — Status

Migration from the legacy `apps/api/` + `apps/web/` split into the
universal-acceptance-criteria-compliant `apps/outlook/` layout.

| Phase | Description | State |
| ----- | ----------- | ----- |
| 1 | `apps/outlook/` shell — README, FEATURES, PORTS, Taskfile, scripts, dockerfiles, docker-compose.dev.yml, pyproject.toml | ✅ |
| 2 | Backend port — TOOLS registry (63 tools) + `call_tool` dispatcher + `/tools` and `/step` endpoints + `init.sql` + `seed_app.py` + 11 pytest tests green + §2 security gates on `/rl/reset` & `/rl/restore` | ✅ |
| 3 | Frontend Vite migration — Vite + React 19 + React Router v7 + Tailwind 4. 80 files ported from `apps/web/src/`. `next-compat.ts` shim back-compats `useRouter` / `usePathname` / `useSearchParams` / `useParams` so legacy call sites resolve without rewrites. | ✅ |
| 4 | e2e scaffolding — 5 fixtures, 10 POMs, 14 specs (auth, mail, calendar, smoke), COVERAGE.md (62 rows), HANDBOOK.md, gen-spec/system-prompt.md, `.github/workflows/e2e-outlook.yml` | ✅ |
| 5 | Testid coverage on every page root — 10/10 page POMs now have a matching `data-testid="<page>-page"` selector in the source tree | ✅ |
| 6 | Deploy + verify against acceptance criteria end-to-end | In progress |

## Acceptance gates passing

- `task outlook:validate` → all §1 file paths present, 80 tool literals, 10 page components, no f-string SQL, no leaked paths, security audit clean
- `task outlook:test-unit` → 11/11 pytest checks (registry shape, /health, /tools, /step, /rl/reset security)
- `pnpm-workspace.yaml` lists `apps/outlook/app/frontend` as a workspace member
- `apps/web/src/lib/api.ts` BASE_URL no longer hardcodes `http://localhost:8000`
- `/rl/reset` and `/rl/restore` require `X-Reset-Token` header (env-gated)

## What's still running on the legacy stack

- `scripts/deploy/e2b-deploy.mjs` continues to deploy the legacy `apps/api/` + `apps/web/` setup. Phase 6 verifies the new `apps/outlook/` stack boots locally first, then either retargets the deploy script or stands up a new one.

## Known carry-overs from the legacy stack

- **Conversation `_link_recipient_thread`** at delivery time converges related rows onto a single `conversation_id` by normalized subject + sender↔recipient participation. Required because seed data is one-sided.
- **Boomerang reminder** is a self-to-self message with body fingerprint `"Message moved to top of Inbox by Boomerang"` rendered with yellow tray + flag.
- **Compose draft auto-save on navigate** — `MessageListItem.handleClick` calls `editorStore.onSaveAndClose()` so the in-flight draft is persisted before the reading pane is freed.
