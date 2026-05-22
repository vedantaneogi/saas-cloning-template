# Outlook Clone — Status

Migration from the legacy `apps/api/` + `apps/web/` split into the
universal-acceptance-criteria-compliant `apps/outlook/` layout.

| Phase | Description | State |
| ----- | ----------- | ----- |
| 1 | `apps/outlook/` shell — README, FEATURES, PORTS, Taskfile, scripts, dockerfiles, docker-compose.dev.yml, pyproject.toml | ✅ |
| 2 | Backend port — TOOLS registry (64 tools) + `call_tool` dispatcher + `/tools` and `/step` endpoints + `init.sql` + `seed_app.py` + 13 pytest tests green + §2 security gates on `/rl/reset` & `/rl/restore` | ✅ |
| 3 | Frontend Vite migration — Vite + React 19 + React Router v7 + Tailwind 4. 80 files ported from `apps/web/src/`. `next-compat.ts` shim back-compats `useRouter` / `usePathname` / `useSearchParams` / `useParams` so legacy call sites resolve without rewrites. | ✅ |
| 4 | e2e scaffolding — 5 fixtures, 10 POMs, COVERAGE.md (62 rows), HANDBOOK.md, gen-spec/system-prompt.md, `.github/workflows/e2e-outlook.yml` | ✅ |
| 5 | Testid coverage on page roots + form fields + action buttons + list rows + tabs | ✅ |
| 6 | Deploy + verify against live stack — `task outlook:up` boots cleanly, **20/20 e2e specs pass** against the booted stack in CI | ✅ |
| §2 follow-up | Cookie-based auth (`outlook_session` httpOnly) replaces JWT-in-localStorage | ✅ |
| §4 port-over | Landed in `collinear-apps/app-clones` PR #66 — `apps/outlook/` + `cua/dev/apps.yml` + `cua/dev/ports.json` + `packages/clone-tls/Caddyfile.shared` + `.github/workflows/e2e-outlook.yml` | ✅ |

## Acceptance gates passing

- `task outlook:validate` → all §1 file paths present, 64 tool literals, 10 page components, no f-string SQL, no leaked paths, security audit clean
- `task outlook:test-unit` → **13/13** pytest checks (registry shape, /health, /tools, /step, cookie auth, /rl/reset security)
- `task outlook:test-e2e` → **20/20** Playwright specs in 22.7s ([CI run](https://github.com/collinear-apps/app-clones/actions/runs/26304509260))
- collinear-apps PR #66: **both checks GREEN** (build-and-test 4m19s + e2e 2m40s)

## Carry-overs from the legacy stack (preserved for behavioral parity)

- **Conversation `_link_recipient_thread`** at delivery time converges related rows onto a single `conversation_id` by normalized subject + sender↔recipient participation. Required because seed data is one-sided.
- **Boomerang reminder** is a self-to-self message with body fingerprint `"Message moved to top of Inbox by Boomerang"` rendered with yellow tray + flag.
- **Compose draft auto-save on navigate** — `MessageListItem.handleClick` calls `editorStore.onSaveAndClose()` so the in-flight draft is persisted before the reading pane is freed.
