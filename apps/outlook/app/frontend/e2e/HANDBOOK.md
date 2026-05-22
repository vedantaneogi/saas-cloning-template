# Outlook Clone — e2e HANDBOOK

This is the onboarding doc for anyone landing in the e2e suite for the
first time. Read it once; afterwards, COVERAGE.md is your daily contract
and README.md is the command reference.

## 1. What this suite tests

The user-visible contract of the Outlook clone — every flow a reviewer
might check by hand. Auth, inbox, compose, threading, reading pane,
folder CRUD, calendar event lifecycle, contacts CRUD, tasks, groups,
search, settings, DLP banner, sensitivity labels, schedule-send,
Boomerang follow-up. The list lives in `COVERAGE.md`.

## 2. The fixtures

`fixtures/test.ts` extends `@playwright/test` with four custom fixtures:

- `api` — `ApiClient` instance with `login`, `step`, `tools`, `health`,
  `reset`. Use it to **arrange state via API** before driving the UI.
- `db` — wraps `api.reset()` + `task outlook:seed` for tests that need a
  clean slate.
- `authedAs` — switch the current `BrowserContext` to a different seed
  user. Use sparingly; most specs run as Frank (default storage state).
- `ns` — per-spec unique prefix so multi-worker / re-runs don't collide.

## 3. The conventions

- **Default auth = Frank Miller.** `frank.miller@acmecorp.com` /
  `password123`. Auth-flow specs opt out with
  `test.use({ storageState: { cookies: [], origins: [] } })`.
- **Testid discipline.** Every element a test touches has a stable
  `data-testid`. Page roots use `<page>-page` (e.g. `mail-page`,
  `login-page`). Page-level `data-testid` doubles as the loaded
  indicator.
- **Tool registry.** Every tool a spec uses via `api.step()` exists in
  `app/server.py:TOOLS`. The fixture caches the registry on first call
  and asserts on every step.
- **`ns.name(...)` for created entities.** Per-spec unique prefixes.
- **Arrange via API, act + assert via UI.** Don't drive 30 clicks to set
  up state — call `api.step` to seed the precondition, then drive the
  actual contract through the browser.
- **Each spec file is independently runnable.** No shared mutable state.

## 4. Writing a new spec

1. Find or add the row in `COVERAGE.md`.
2. If the surface needs a new POM, add it in `pages/<Surface>Page.tsx`
   following the BasePage convention.
3. Author the spec in `specs/<surface>.spec.ts`, importing from
   `../fixtures/test` (not `@playwright/test` directly — you need our
   extended `test`).
4. Run locally: `task outlook:test-e2e -- --grep "<spec name>"`.
5. Flip the row in `COVERAGE.md` from 🟡 → ✅ and submit the PR.

## 5. When a spec flakes

1. First, do not retry-and-forget — open a Linear ticket and flag the
   row in `COVERAGE.md` with ⚠️.
2. The most common cause is timing: a query refetch hasn't settled.
   Prefer `expect(...).toBeVisible({ timeout: 10_000 })` to a bare
   `await page.waitForTimeout(...)`.
3. The second most common cause is leftover state from another spec.
   Use `db.resetAndReseed()` in `beforeEach` if your test mutates the
   inbox / sent folder.

## 6. Hard rules

- **Never** read or assert on the URL alone — always also wait for a
  testid. Routes can change; testids are the contract.
- **Never** assert on user-visible text from translated strings —
  use testids and/or `getByRole`.
- **Never** hand-edit `.auth/*.json` — re-run `task outlook:up &&
  task outlook:seed` and let `global.setup.ts` regenerate them.
