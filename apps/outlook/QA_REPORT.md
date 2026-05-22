# QA Report — Outlook Clone

Acceptance walk-through against
`universal-acceptance-criteria.md`. Updated as each phase lands.

| §  | Check                                                                                    | State        |
| -- | ---------------------------------------------------------------------------------------- | ------------ |
| 1  | `apps/outlook/` shell present (README, FEATURES, Taskfile, dockerfiles, scripts, app/)   | ✅ scaffolded |
| 1  | `app/server.py`, `models.py`, `schema.py` exist                                          | ⏳ Phase 2    |
| 1  | `app/postgres/init.sql` exists                                                           | ⏳ Phase 2    |
| 1  | `app/seed/seed_app.py` exists                                                            | ⏳ Phase 2    |
| 1  | `app/seed_data/*.json` ≥1 file                                                           | ⏳ Phase 2    |
| 1  | `app/tests/test_tools.py` exists                                                         | ⏳ Phase 2    |
| 1  | `app/frontend/package.json`, `src/App.tsx`, `src/design-tokens.css` exist                | ⏳ Phase 3    |
| 1  | `app/frontend/src/pages/*.tsx` ≥2 files                                                  | ⏳ Phase 3    |
| 1  | `app/frontend/playwright.config.ts` exists                                               | ⏳ Phase 3    |
| 1  | `app/frontend/e2e/{fixtures,pages,specs,gen-spec}` populated                             | ⏳ Phase 4    |
| 2  | No public unauthenticated `POST /reset`                                                  | ⏳ Phase 2    |
| 2  | No string-concat SQL                                                                     | ✅ verified   |
| 2  | No plaintext password compares                                                           | ✅ verified   |
| 2  | No backdoor login routes                                                                 | ✅ verified   |
| 2  | No leaked personal paths                                                                 | ✅ verified   |
| 2  | No hardcoded `http://localhost` in shipped frontend                                      | ⏳ Phase 3    |
| 3  | `task outlook:*` surface present                                                         | ✅ Phase 1    |
| 3  | `task outlook:up` boots from a clean `task outlook:down`                                 | ⏳ Phase 6    |
| 3  | `task outlook:validate` exits zero                                                       | ⏳ Phase 2    |
| 3  | `task outlook:test-unit` is 100% green                                                   | ⏳ Phase 2    |
| 3  | `task outlook:test-e2e` runs ≥1 spec to green                                            | ⏳ Phase 4    |
| 4  | `cua/dev/apps.yml` entry                                                                 | ⏳ Port-over  |
| 4  | `cua/dev/ports.json` entry (8045 / 5445)                                                 | ⏳ Port-over  |
| 4  | `packages/clone-tls/` entry                                                              | ⏳ Port-over  |
| 4  | `.github/workflows/e2e-outlook.yml`                                                      | ⏳ Phase 4    |
| 5  | e2e `fixtures/{test,api,auth,db,namespace}.ts` present                                   | ⏳ Phase 4    |
| 5  | `COVERAGE.md` populated (~60 rows)                                                       | ⏳ Phase 4    |
| 5  | ≥1 hand-authored spec passes                                                             | ⏳ Phase 4    |
| 6  | Every interactive element has a `data-testid`                                            | ⏳ Phase 5    |
| 7  | `README.md` port + login match real seed                                                 | ✅ Phase 1    |
| 8  | PR description has summary + URL + login + screenshot + test output                      | ⏳ Phase 6    |

## Legend

- ✅ done
- ⏳ pending in the indicated phase
- ❌ blocked / needs senior input
