# Outlook Clone — e2e Suite

Playwright-based end-to-end coverage for the Outlook clone. Mirrors the
`apps/github/app/frontend/e2e/` structure from `collinear-apps/app-clones`.

## Running

Prerequisites:

```bash
task outlook:up       # builds frontend, starts postgres + clone-app + caddy, seeds
task outlook:seed     # idempotent reseed if needed
```

Then:

```bash
task outlook:test-e2e-install   # one-time: download Playwright Chromium
task outlook:test-e2e           # full suite
task outlook:test-e2e-ui        # interactive UI mode for spec authoring
task outlook:test-e2e-report    # open the HTML report from the last run
```

## Layout

```
e2e/
├── README.md             This file.
├── HANDBOOK.md           Onboarding doc — read first.
├── COVERAGE.md           Flow contract — gen-spec reads this.
├── playwright.config.ts  (one level up — at app/frontend/)
├── global.setup.ts       Pre-generates session cookies for every seed user.
├── .auth/                Per-user `storageState` JSON — gitignored.
├── fixtures/
│   ├── test.ts           Combines all fixtures into a single `test` import.
│   ├── api.ts            HTTP client + ApiClient fixture.
│   ├── auth.ts           Seed-user metadata + `authedAs` switcher.
│   ├── db.ts             Reset / reseed / regenerate storage states.
│   └── namespace.ts      Per-spec unique prefix to avoid name collisions.
├── pages/
│   ├── BasePage.ts       goto + waitForLoaded.
│   ├── LoginPage.ts
│   ├── MailPage.ts
│   ├── ComposePage.ts
│   ├── CalendarPage.ts
│   ├── ContactsPage.ts
│   ├── TasksPage.ts
│   ├── GroupsPage.ts
│   ├── SearchPage.ts
│   └── SettingsPage.ts
├── specs/
│   ├── auth.spec.ts      Sign-in, sign-out, redirect, session persistence.
│   ├── mail.spec.ts      Inbox, folder switch, open message, focused/other.
│   ├── calendar.spec.ts  Month / week / day view renders.
│   └── smoke.spec.ts     Every surface renders + backend tool registry smoke.
└── gen-spec/
    └── system-prompt.md  Spec-generator instructions.
```

## Default auth

The default project in `playwright.config.ts` pre-loads
`e2e/.auth/frank.miller.json`, so every spec starts logged in as Frank
Miller. Specs that need a logged-out start opt in via:

```ts
test.use({ storageState: { cookies: [], origins: [] } })
```

## Testid discipline

Every page POM expects a `data-testid="<page>-page"` on the page root.
That testid doubles as the "loaded" indicator —
`BasePage.waitForLoaded()` waits for it before returning from `goto()`.
The Phase 5 testid sweep adds the remaining attributes on every form
field, action button, list row, tab, modal, and empty/error state.

## Per-spec namespacing

Specs that create labelled entities (folders, contacts, tasks, signatures,
…) use the `ns` fixture:

```ts
test('creates a folder', async ({ page, ns }) => {
  const name = ns.name('folder') // e.g. e2e-w0-creates-a-folder-l9pq1z-folder
  // ...
})
```

The prefix is unique per `{worker, spec title, timestamp}` so parallel and
repeat runs never collide.
