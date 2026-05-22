# QA Report — Outlook Clone

Walk-through against `universal-acceptance-criteria.md`. Last run: end of
Phase 5 (testid sweep complete; Phase 6 deploy + verify in progress).

| §  | Check                                                                                    | State |
| -- | ---------------------------------------------------------------------------------------- | :---: |
| 1  | `apps/outlook/{README, FEATURES, Taskfile, dockerfiles, scripts, app/, docker-compose.dev.yml}` | ✅ |
| 1  | `app/server.py` exposes a configured FastAPI `app` + `TOOLS = [...]` (≥30 entries)        | ✅ 63 |
| 1  | `app/models.py` + `app/schema.py` exist as re-export shims (packages stay intact)        | ✅ |
| 1  | `app/postgres/init.sql` exists (baseline DDL, full schema topped up via Base.create_all) | ✅ |
| 1  | `app/seed/seed_app.py` + `app/seed_data/seed-default.json`                               | ✅ |
| 1  | `app/tests/test_tools.py` — 11 pytest checks green                                       | ✅ |
| 1  | `app/frontend/{package.json, src/App.tsx, src/design-tokens.css, src/pages/*.tsx ≥ 2}`   | ✅ 10 |
| 1  | `app/frontend/playwright.config.ts` + `e2e/{global.setup.ts, fixtures, pages, specs}`    | ✅ |
| 2  | No public unauthenticated `POST /rl/reset` (gated by `RL_RESET_TOKEN`)                   | ✅ |
| 2  | No string-concat SQL                                                                     | ✅ |
| 2  | No plaintext password compares (bcrypt via passlib)                                       | ✅ |
| 2  | No backdoor login routes                                                                  | ✅ |
| 2  | No leaked personal paths                                                                  | ✅ |
| 2  | No hardcoded `http://localhost` in shipped frontend                                       | ✅ |
| 3  | `task outlook:*` surface — every task from §3 present                                    | ✅ |
| 3  | `task outlook:validate` exits zero                                                       | ✅ |
| 3  | `task outlook:test-unit` is 100% green (11/11)                                           | ✅ |
| 3  | `task outlook:test-e2e` — auth + mail + calendar + smoke specs authored                  | 🟡 needs running stack |
| 3  | `task outlook:up` boots from a clean `task outlook:down`                                 | ⏳ Phase 6 verify |
| 4  | `cua/dev/apps.yml` entry                                                                 | ⏳ Port-over to collinear-apps |
| 4  | `cua/dev/ports.json` entry (8045 / 5445)                                                 | ⏳ Port-over |
| 4  | `packages/clone-tls/` entry                                                               | ⏳ Port-over |
| 4  | `.github/workflows/e2e-outlook.yml`                                                       | ✅ |
| 5  | e2e `fixtures/{test,api,auth,db,namespace}.ts` present                                   | ✅ |
| 5  | `COVERAGE.md` populated (62 rows, 14 ✅ + 48 🟡)                                         | ✅ |
| 5  | ≥1 hand-authored spec passes                                                              | 🟡 needs running stack |
| 6  | Every interactive element has a `data-testid`                                             | 🟡 page roots done; deeper sweep deferred |
| 7  | `README.md` port + login match real seed                                                 | ✅ 8045 + frank.miller@acmecorp.com / password123 |
| 8  | PR description has summary + URL + login + screenshot + test output                      | ⏳ Phase 6 |

## What changes when Phase 6 lands

- `task outlook:up && task outlook:test-e2e` runs the live spec suite locally and verifies the 14 ✅ rows pass against the booted Vite frontend + FastAPI backend.
- E2B sandbox URL is updated to point at `apps/outlook/` rather than the legacy `apps/api/ + apps/web/` split (or both stay alive until the new stack is byte-for-byte verified).
- The 6 stub `🟡` rows under §3/§5/§6 flip to ✅ once exercised against the live stack.

## Legend

- ✅ done
- 🟡 partial / deferred to a later milestone
- ⏳ pending (Phase 6 or port-over)
- ❌ blocked / needs senior input
