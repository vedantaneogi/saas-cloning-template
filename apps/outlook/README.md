# Outlook Clone

A pixel-fidelity clone of Microsoft Outlook on the web, built to the
**`collinear-apps/app-clones` universal acceptance criteria**.

## Quick start

```bash
# One-shot: build frontend, start the stack (postgres + clone-app + caddy), seed.
task outlook:up

# Then open:
#   https://outlook.clone.test/    (named TLS via the shared caddy gateway)
#   http://localhost:8045/         (legacy localhost, direct to container)
```

| Service           | Host port | Container port |
| ----------------- | --------: | -------------: |
| Backend (FastAPI) |  **8045** |           8030 |
| Frontend (Vite)   |  **3045** |            n/a |
| Postgres          |  **5445** |           5432 |

## Default login

| User                              | Password      | Role            |
| --------------------------------- | ------------- | --------------- |
| `frank.miller@acmecorp.com`       | `password123` | seeded worker   |
| `alice.johnson@acmecorp.com`      | `password123` | seeded worker   |
| `bob.smith@acmecorp.com`          | `password123` | seeded worker   |
| `david.brown@acmecorp.com`        | `password123` | seeded worker   |

All ten seeded users share the same password (`password123`). Frank's mailbox
is the canonical demo surface — it has the Project Alpha thread, calendar
events, contacts, attachments, and rules pre-populated.

## What's inside

```
apps/outlook/
├── README.md                       This file.
├── FEATURES.md                     Feature manifest (validate.sh greps this).
├── PORTS.md                        Port allocations for multi-clone dev.
├── STATUS.md                       Project status — what's done, what's next.
├── QA_REPORT.md                    QA snapshot vs. the acceptance criteria.
├── Taskfile.yml                    Every per-app task. See `task --list outlook`.
├── docker-compose.dev.yml          postgres + clone-app + optional seed.
├── pyproject.toml                  Python workspace member.
├── .env.example                    Copy to .env for local dev.
├── dockerfiles/
│   ├── Dockerfile.app              FastAPI image.
│   ├── Dockerfile.postgres         Postgres + init.sql baked.
│   └── Dockerfile.seed             Seed-runner image (--profile seed).
├── scripts/
│   ├── start.sh                    Boot helper.
│   └── validate.sh                 Repo-structure validator (§1).
├── tasks/                          Golden-run scenarios for the RL harness.
└── app/
    ├── server.py                   FastAPI + TOOLS registry (≥30 tools).
    ├── models.py                   SQLAlchemy models.
    ├── schema.py                   Pydantic arg schemas.
    ├── postgres/init.sql           DDL — declarative, idempotent.
    ├── seed/seed_app.py            Orchestrates seed steps via call_tool.
    ├── seed_data/*.json            Fixtures consumed by seed_app.py.
    ├── tests/test_tools.py         pytest, hits the live tool server.
    └── frontend/
        ├── package.json            @clone-apps/outlook-frontend.
        ├── playwright.config.ts    BASE_URL derived from CLONE_DOMAIN+CADDY_HOST_PORT.
        ├── vite.config.ts          Vite + React + dev proxy.
        ├── src/App.tsx             Routes registered here.
        ├── src/main.tsx            React mount + theme init.
        ├── src/design-tokens.css   Outlook Fluent design tokens.
        └── e2e/                    Playwright suite — see e2e/COVERAGE.md.
```

## Tasks

```bash
task --list outlook          # show every task
task outlook:up              # one-shot: build + start + seed
task outlook:down            # stop + remove volumes
task outlook:seed            # reseed the running stack
task outlook:validate        # repo-structure check
task outlook:test-unit       # pytest
task outlook:test-e2e        # playwright (requires task outlook:up)
task outlook:dev-backend     # local uvicorn against the docker postgres
task outlook:dev-frontend    # vite hot reload
```

## Shipped features (Tier 1)

The full list lives in [`FEATURES.md`](./FEATURES.md). Highlights:

- **Mail** — Inbox / Drafts / Sent / Scheduled / Archive / Junk / Deleted /
  custom folders, Focused/Other split, conversation threading across mailboxes,
  drag-to-folder, follow-up flag, snooze, pin, rules.
- **Compose** — full ribbon (font / color / highlight / lists / styles /
  spacing / insert link/image), inline DLP banner, sensitivity tag, encrypt
  modes, Boomerang follow-up reminder, schedule send, attachment intent
  prompt, @-mention auto-CC.
- **Reading pane** — Right / Bottom / Off, threaded view with newest at top,
  inline reply UI matches new-email compose, attachment preview modal
  (PDF / image / DOCX / XLSX / PPTX / CSV).
- **Calendar** — Day / Week / Month views, event create/edit, recurring events,
  full Scheduling Assistant with per-attendee availability, room finder,
  organizer row, email autocomplete.
- **People** — Contacts list, detail pane, favorites.
- **To Do** — Lists, tasks, due dates, flagged-mail integration.
- **Groups** — Group list, channel-style email tab, calendar/files tabs.
- **Search** — Top-bar with filters (from/to/subject/keywords/date/read/
  attachments), All / Mail / Files / Teams / People tabs, recent searches,
  contact-from chips.
- **Settings** — Profile, Mail settings (reading pane, density, conversations),
  Signatures, Categories, OOF, Rules, Mailbox quota, Account switcher.

## Acceptance status

See [`STATUS.md`](./STATUS.md) and [`QA_REPORT.md`](./QA_REPORT.md) for the
current §1–§9 walk-through against the universal acceptance criteria.
