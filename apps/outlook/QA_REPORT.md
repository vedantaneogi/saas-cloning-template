# QA Report — Outlook Clone

Walk-through against `universal-acceptance-criteria.md`. **All §1–§8 boxes ticked**, verified by both CI checks on `collinear-apps/app-clones` PR #66.

| §  | Check                                                                                    | State |
| -- | ---------------------------------------------------------------------------------------- | :---: |
| 1  | `apps/outlook/{README, FEATURES, Taskfile, dockerfiles, scripts, app/, docker-compose.dev.yml}` | ✅ |
| 1  | `app/server.py` exposes a configured FastAPI `app` + `TOOLS = [...]` (≥30 entries)        | ✅ 64 |
| 1  | `app/models.py` + `app/schema.py` exist as re-export shims (packages stay intact)        | ✅ |
| 1  | `app/postgres/init.sql` exists (ENUMs; tables built by `create_all` from live models)    | ✅ |
| 1  | `app/seed/seed_app.py` + `app/seed_data/seed-default.json`                               | ✅ |
| 1  | `app/tests/test_tools.py` — 13 pytest checks green                                       | ✅ |
| 1  | `app/frontend/{package.json, src/App.tsx, src/design-tokens.css, src/pages/*.tsx ≥ 2}`   | ✅ 10 |
| 1  | `app/frontend/playwright.config.ts` + `e2e/{global.setup.ts, fixtures, pages, specs}`    | ✅ |
| 2  | No public unauthenticated `POST /rl/reset` (gated by `RL_RESET_TOKEN`)                   | ✅ |
| 2  | No string-concat SQL                                                                     | ✅ |
| 2  | No plaintext password compares (bcrypt via passlib)                                       | ✅ |
| 2  | No backdoor login routes                                                                  | ✅ |
| 2  | No leaked personal paths                                                                  | ✅ |
| 2  | No hardcoded `http://localhost` in shipped frontend                                       | ✅ |
| 2  | Sessions via httpOnly `outlook_session` cookie (Bearer kept as transitional fallback)    | ✅ |
| 3  | `task outlook:*` surface — every task from §3 present                                    | ✅ 20 tasks |
| 3  | `task outlook:validate` exits zero                                                       | ✅ |
| 3  | `task outlook:test-unit` is 100% green                                                   | ✅ 13/13 |
| 3  | `task outlook:test-e2e` — auth + mail + calendar + smoke specs pass against live stack   | ✅ **20/20 in 22.7s** ([CI run](https://github.com/collinear-apps/app-clones/actions/runs/26304509260)) |
| 3  | `task outlook:up` boots from a clean `task outlook:down`                                 | ✅ verified by CI |
| 4  | `cua/dev/apps.yml` entry                                                                 | ✅ landed in PR #66 |
| 4  | `cua/dev/ports.json` entry (8045 frontend / 5445 db)                                     | ✅ landed in PR #66 |
| 4  | `packages/clone-tls/Caddyfile.shared` → `outlook.clone.test`                              | ✅ landed in PR #66 |
| 4  | `.github/workflows/e2e-outlook.yml`                                                       | ✅ landed in PR #66 |
| 5  | e2e `fixtures/{test,api,auth,db,namespace}.ts` present                                   | ✅ identical file list to apps/github |
| 5  | `COVERAGE.md` populated (62 rows, in the 50–70 target band)                              | ✅ |
| 5  | ≥1 hand-authored spec passes against live stack                                          | ✅ **20/20 passed** |
| 6  | Every page root has `<page>-page` testid                                                  | ✅ 10/10 |
| 6  | Form-field testids (login + signup)                                                       | ✅ |
| 6  | Action-button, list-row, tab testids                                                      | ✅ `compose-send`, `message-row-<id>`, `folder-row-<slug>`, `inbox-tab-{focused,other}`, `settings-tab-<section>` |
| 7  | `README.md` port + login match real seed (8045 + frank.miller@acmecorp.com)              | ✅ |
| 7  | `cua/dev/ports.json` matches `docker-compose.dev.yml`                                     | ✅ |
| 8  | PR #66 description = summary + URLs + login + checks + test output + commits + deviations | ✅ |

## CI evidence

- **build-and-test**: PASS in 4m19s — [run 26304509230](https://github.com/collinear-apps/app-clones/actions/runs/26304509230)
- **e2e (outlook)**: PASS in 2m40s, 20/20 specs in 22.7s — [run 26304509260](https://github.com/collinear-apps/app-clones/actions/runs/26304509260)

## Per-spec result

```
✓  setup    › stack is reachable                                     54ms
✓  setup    › pre-generate storage state for seed users              1.5s
✓  auth     › valid login lands on inbox                             2.3s
✓  auth     › invalid password shows error                           1.4s
✓  auth     › logged-out access redirects to /sign-in                746ms
✓  auth     › session persists across reload                         2.3s
✓  calendar › month view renders                                     811ms
✓  calendar › week view renders                                      833ms
✓  calendar › day view renders                                       804ms
✓  mail     › inbox loads                                            1.0s
✓  mail     › switches to sent folder                                1.7s
✓  mail     › opens a seeded message in the reading pane             1.4s
✓  mail     › focused / other toggle works                           1.3s
✓  smoke    › contacts renders                                       718ms
✓  smoke    › tasks renders                                          923ms
✓  smoke    › groups renders                                         798ms
✓  smoke    › search renders                                         719ms
✓  smoke    › settings renders                                       697ms
✓  smoke    › GET /tools returns the registry                        73ms
✓  smoke    › POST /step rejects unknown tool                        18ms
20 passed (22.7s)
```

## Legend

- ✅ done, verified by either CI or a local task run
