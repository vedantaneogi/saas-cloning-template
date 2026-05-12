# Clone status — vs. linear.xlsx feature matrix

Last updated: 2026-05-12. Status keys: ✅ built · 🟡 partial · ❌ not started.

---

## Core entities

| Entity | DB model | API | UI | Notes |
| --- | :-: | :-: | :-: | --- |
| Workspace | ✅ | ✅ | ✅ | One workspace (`demo`) seeded |
| Team | ✅ | ✅ | ✅ | 2 teams seeded (ENG, DES); per-team estimate scale |
| Issue | ✅ | ✅ | ✅ | Full CRUD + archive + move-between-teams + convert-to-subissue |
| Member | ✅ | ✅ | ✅ | Admin/Member/Guest roles, team_memberships join |
| WorkflowState | ✅ | ✅ | ✅ | Default 6 per team; full editor |
| Label | ✅ | ✅ | ✅ | Workspace + team-scoped CRUD |
| Comment | ✅ | ✅ | ✅ | Threaded replies, @mentions, reactions |
| CommentReaction | ✅ | ✅ | ✅ | Toggle per (comment, member, emoji) |
| IssueLink | ✅ | ✅ | ✅ | GitHub PR/branch/Figma/URL autodetect |
| IssueRelation | ✅ | ✅ | ✅ | Full create/delete with symmetric pairing |
| IssueSubscriber | ✅ | ✅ | ✅ | Subscribe/Unsubscribe; auto-subscribe on comment |
| Project | ✅ | ✅ | ✅ | Cross-team via project_teams; resources panel |
| ProjectResource | ✅ | ✅ | ✅ | External links per project |
| Initiative | ✅ | ✅ | ✅ | Status pill, owner, target date, project rollup |
| Cycle | ✅ | ✅ | ✅ | Per-team cycles; complete + rollover button |
| Roadmap | ✅ | ✅ | ✅ | Initiatives × projects timeline with completion fill |
| Milestone | ✅ | ✅ | ✅ | Inline add on project detail |
| View (saved) | ✅ | ✅ | ✅ | Per-team, with favorites |
| Document | ✅ | ✅ | ✅ | Workspace + project-scoped markdown w/ autosave |
| Triage | ✅ | ✅ | ✅ | Per-team queue, accept/decline |
| Customer Request | ✅ | ✅ | ✅ | Source tag, status, issue linking |
| Notification | ✅ | ✅ | ✅ | Assign / status / comment / mention / reaction |

---

## P0 features

### Workspace & teams
- ✅ Workspace home, sidebar, team switcher
- ✅ Create team UI in settings
- ✅ Team settings — name, icon color, cycles toggle, workflow states editor, team labels CRUD, estimate scale picker
- ✅ Workspace settings — members with role editor, workspace labels CRUD, teams index

### Issue CRUD
- ✅ Create issue modal (C shortcut) with inline pickers + chips
- ✅ Quick add inline in list + board views (+ button per state group)
- ✅ Open issue full page (URL-routable)
- ✅ Inline title + markdown description editing
- ✅ Delete with confirm
- ✅ Duplicate
- ✅ Archive / unarchive (banner + bulk + per-issue action)
- ✅ Move issue between teams (re-keys identifier, maps state to closest group)

### Issue metadata
- ✅ Status / Priority / Assignee / Labels / Estimate / Due date pickers
- ✅ Project + Cycle assignment
- ✅ Subscribers (Bell/BellOff button on Activity header; chip list in side rail)

### Views & filtering
- ✅ Default views (Active, Backlog, All) + Archived
- ✅ Saved views w/ favorites; `/view/<id>` route
- ✅ Filter builder (priority / status / assignee / label / project)
- ✅ Group by status / priority / assignee / project / label
- ✅ Sort — priority / updated / created / due date
- ✅ List + Board displays

### Cycles
- ✅ Configure per team (cycles_enabled + estimate scale)
- ✅ Cycle list + detail (progress, issue grouping)
- ✅ Active cycle linked from sidebar
- ✅ Complete cycle button rolls unfinished issues to the next cycle

### Projects
- ✅ Create project from `/projects` topbar
- ✅ Project overview with status row, milestones, updates, docs, resources
- ✅ Add / remove issues via picker
- ✅ Inline milestone create
- ✅ Project status + health badges
- ✅ Documents linked to projects
- ✅ External resources panel
- ✅ Cross-team projects via team chips picker

### Triage
- ✅ Triage inbox per team
- ✅ Accept / Decline actions

### Sub-issues & relations
- ✅ Convert to sub-issue (search-picker dialog from `...` menu)
- ✅ Add sub-issue inline from parent issue detail
- ✅ Issue relations: blocks / blocked-by / related / duplicate — full create UI w/ symmetric inverse, search-picker

### Comments & collaboration
- ✅ Comment thread (render + post) with real timestamps
- ✅ @mention with autocomplete (full kbd nav, mention pills, fires `mentioned` notifications)
- ✅ Reply to comment (flat one-level threads)
- ✅ Reactions (6 quick emojis + popover; per (comment, member, emoji))
- ✅ Linked PRs / branches with auto-detected type + status badge

### Search & navigation
- ✅ Command palette (`Cmd-K` / `Ctrl-K` / `/`)
- ✅ Global search across issues, projects, teams, members, views, initiatives, documents
- ✅ Palette per-property filter syntax (`in:issues`, `team:ENG`, `@alex`)
- ✅ Recent items (up-to-6 MRU per workspace from localStorage)
- ✅ Keyboard shortcuts — `C`, `0-4`, `S` / `A` / `L` / `P` / `E`, `?`, `Cmd-K`, `/`, `Esc`

### Inbox & notifications
- ✅ Inbox list with mark-read on click and "Mark all read"
- ✅ Filter pills (All / Unread / Mentions)
- ✅ Notification generation — assign, status change, comment, mention, reaction
- ✅ Auto-subscribe commenter; subscribers notified on future comments

### Bulk operations
- ✅ Multi-select w/ shift-click range
- ✅ Bulk edit action bar (state / priority / assignee)
- ✅ Bulk delete
- ✅ Archive workflow (distinct from delete)
- ✅ CSV export per team
- ✅ CSV import (paste or file upload) creates issues in target team

### Workflow customization
- ✅ Custom workflow states with full CRUD
- ✅ Custom labels (workspace + per-team)
- ✅ Custom estimate scales (fibonacci / linear / exponential / t-shirt / none); issue picker adapts

### Permissions & roles
- ✅ Admin / Member / Guest roles editable in workspace settings
- ✅ Team memberships join table with per-team role override

---

## P1+ polish (now in)

- ✅ Real relative timestamps everywhere
- ✅ Live Subscribe/Unsubscribe button
- ✅ Add-sub-issue from parent UI
- ✅ Relations create UI w/ symmetric inverse
- ✅ Create project modal
- ✅ Milestone create UI
- ✅ Project resources section
- ✅ Cross-team project chips
- ✅ Cycle complete + rollover
- ✅ CSV import / export
- ✅ Palette filter syntax + recents
- ✅ Single-key picker shortcuts (S/A/L/P/E)
- ✅ Dead-button sweep — removed stub Maximize/Section More buttons; wired board column "+"

---

## P1 backlog (from linear.xlsx)

7-wave functional sweep landed 2026-05-13 — most P1 rows from the matrix are now ✅. UI polish is the next phase; this list tracks feature completeness, not visual fidelity.

### Cycles / projects analytics
- ✅ Cycle progress chart (burndown) — `/cycle/{id}` page; SVG line vs ideal
- ✅ Cycle insights (velocity, throughput, scope changes) — 4 metric cards above the burndown
- ✅ Project completion charts (scope vs completion over time, risk indicators) — `/project/{slug}` "Completion over time" section + health derived
- ✅ Team insights dashboard (velocity, lead time, cycle time, throughput) — new `/team/{key}/insights` page with per-cycle bars
- ❌ Custom charts (build chart from any saved view) — deferred; needs a chart builder UI
- ✅ Roadmap filter / group (status, team) + group toggle (initiative | team)

### Triage / SLA
- ✅ SLA / aging indicators — triage queue chips: neutral <3d, amber 3-6d, urgent ≥7d
- 🟡 Triage responsibility rotation — automation engine supports `rotate_assign` on `on_issue_create`; preset wiring is left to user setup
- 🟡 SLA / due-date escalation — engine has all action types; due-date-passed trigger not added (one of the leftover items)

### Issue niceties
- ✅ Auto-close on duplicate — creating a `duplicate` relation transitions source to its team's Canceled state and posts a system comment
- ✅ Parent progress rollup — already in list + board rows via SubIssueProgress + done/total

### Notifications
- ✅ Snooze notification — inbox row hover surfaces 1h / 1d buttons; snoozed rows hidden from list + unread count until release
- ✅ Email digest (daily / weekly) — `/inbox/digest` renders HTML; "Copy HTML" copies the body. No SMTP delivery (infra).
- ✅ Per-team / per-project subscription preferences — `/settings/notifications` mute toggle per scope; muted scopes drop notifications at create-time

### Documents
- ✅ Slash menu — `/` at start of blank line opens picker (H1/H2/H3, lists, task list, quote, code, divider, issue ref)
- ✅ Inline issue links with hover preview — `[ENG-12]` in markdown becomes IssueRefLink with lazy summary popover
- ✅ Comments on documents — side panel thread; add/delete
- ✅ Version history — auto-snapshot on body change; side panel timeline + Restore (which itself snapshots current state first)

### Templates
- ✅ Issue templates per team — presets (Bug report, Feature request) + custom JSON; picker in create-issue modal pre-fills title/desc/priority/labels
- 🟡 Project templates — model + manager exist (Launch preset with milestones); apply-on-create-project flow is a small follow-up
- 🟡 Document templates — model + presets exist (PRD/RFC/Retro/Postmortem); apply-on-create-document flow is a small follow-up

### Automations & rules
- ✅ Workflow automation rules — 5 triggers (issue create, status change, label added, cycle end, stale-in-state) × 7 actions (move state, assign, label, comment, archive, set priority, rotate assign). CRUD + presets + run-scheduled
- ✅ Auto-assign on triage (rotation) — `rotate_assign` action on `on_issue_create`
- ✅ Auto-close stale issues — `stale_in_state` trigger + admin "Run scheduled rules now" CTA
- ❌ SLA / due-date escalation — would need a `due_date_passed` trigger type (small addition)

### Integrations
- ✅ GitHub — `/api/webhooks/github/{slug}` validates X-Hub-Signature-256, links PRs/branches to issues by identifier, updates IssueLink status on merge/close
- ✅ Slack notifications/intake — `/api/webhooks/slack/{slug}` creates a triage issue from a posted JSON body
- ✅ Figma — link autodetect + iframe embed in IssueLinksPanel
- ❌ Linear Asks (real Slack slash-command flow) — would need a registered Slack app; receiver covers the spirit of the feature

**Most impactful next** (post-UI-polish): real Slack app OAuth + slash command (for Asks), custom-chart builder, due-date escalation trigger, project/document template apply-on-create.

---

## Out of scope (infra, not P1)

- No realtime (router.refresh after mutations)
- Dev runs SQLite; staging deploy on the VM uses Postgres 16 (docker-compose)
- Capture/Playwright golden screenshots not re-run on each slice
- Email delivery: invite links are generated locally; no SMTP wired (copy the link from the invite dialog)

---

## Auth + multi-workspace + invites (done 2026-05-12)

The app is now a real multi-user product:

- **User model** with email + bcrypt password; one User can be Member of many workspaces.
- **JWT session in httpOnly cookie** (`lc_session`, SameSite=Lax, 30d). `AUTH_SECRET` in env; defaults to a dev-insecure literal.
- **`/api/auth`** endpoints: `signup`, `login`, `logout`, `me`, `invites/{token}`, `invites/{token}/accept`.
- **Auth pages** under `/(auth)`: `/login`, `/signup`, `/accept-invite/[token]`. Shared frame with the app brand mark.
- **Middleware** gates every `/(app)` route — no cookie → 307 to `/login`; logged in but visiting `/login` → 307 home.
- **Workspace switcher** in the sidebar header popover lists every workspace the user belongs to, with role chip; "Create workspace" + "Sign out" actions.
- **Workspace creation** at `/new-workspace` — name, team prefix, color → new workspace seeded with the default 6 workflow states and a starter team.
- **Member invitations**: admins on `/settings/members` click "Invite member" → email + role → modal generates an invite URL to copy. Pending invites are listed in the dialog with revoke. Accepting the link runs the signup flow if the email is new or login+accept if the user exists.
- **Role enforcement**: `require_role(MemberRole.admin)` guards invite create/list/revoke. Membership is enforced workspace-wide via `get_current_member` (403 if you're not in the workspace).
- **Demo accounts**: `nm@example.com` (admin), `ap@example.com`, `sr@example.com`, all with password `demo` (seeded automatically). Seed file gained a `role` + `password` field per member.
- **API client** forwards cookies on SSR (via `next/headers`) and `credentials: "include"` on the browser. Every endpoint that used "first member of workspace" now resolves the current user from the session cookie.

---

## Coverage

All P0 features and the immediate P1 polish list are ✅. The matrix above no longer carries 🟡 partials on flagship surfaces. The full P1 backlog from `linear.xlsx` is enumerated below — most P1 rows are still ❌.

---

## Deploy (done 2026-05-12)

Live at **https://linear.techbrig.co** on the staging VM (142.93.203.175) behind Cloudflare + host Caddy.

- `docker-compose.staging.yml` at repo root: Postgres 16 + FastAPI + Next.js standalone
- Containers `linear-clone-{db,api,web}-1` on `linear-clone_default` network
- Web bound to `127.0.0.1:3003`; host `/etc/caddy/Caddyfile` reverse-proxies `linear.techbrig.co → 127.0.0.1:3003`
- API stays internal to the docker network; Next.js rewrites `/api/*` to `http://api:8000` (baked at build time via `API_URL` build arg)
- `AUTH_SECRET` + `POSTGRES_PASSWORD` generated on VM, kept in `/root/linear-clone/.env`
- Migrations run on api container startup (`alembic upgrade head` then uvicorn)
- Demo seed loaded via `SEED_PATH=/app/seed.json`

Postgres revealed three SQLite-tolerated issues that the deploy commit fixed:
- `sa.text('0')` → `sa.false()` for boolean `server_default`
- `member_role` / `estimate_scale` PG ENUM types pre-created before `op.add_column`
- `Project.slug_id` (16 → 128) and `Initiative.slug_id` (32 → 128) widened — slugs are `{name}-{12-hex}` and overflowed real names

---

## UI polish pass — page by page (done 2026-05-12)

Every surface returns 200 on a fresh build and has functional buttons. Pass summary:

1. ✅ **Saved views fixed** — `/view/[id]` now redirects with `?view_id=…` so the team page shows the saved-view name + colored Bookmark icon in the topbar instead of generic "Issues". Tabs hidden in view mode.
2. ✅ **Sidebar** — dead `/more`, "Try" section (Import / Invite / Connect GitHub stubs), and broken `Star`/`PanelRight` icons removed. Help button dispatches `?` (cheatsheet). PencilLine dispatches `c` (new issue). Settings link gets a real gear icon. Footer is its own bordered row.
3. ✅ **Topbar** — collapsed to 44px, dropped the unwired Star (favorite) + PanelRight (side panel) buttons, consistent `px-4` padding.
4. ✅ **Inbox** — All / Unread / Mentions pills, Mark-all-read, kind icon overlay on actor avatar, real `relTime`.
5. ✅ **My Issues** — tabs now navigate (`href` on each scope), counts inline, empty-state copy.
6. ✅ **Team list/board** — hardcoded "May 11" date replaced with `relTime(updated_at)` (or due date when set). Board column "+" wired to inline quick-add.
7. ✅ **Issue detail** — rebuilt around real-data widgets (SubIssuesPanel, RelationsPanel, IssueLinksPanel, SubscribeButton, subscriber chips, archive banner).
8. ✅ **Projects + Project detail** — NewProjectButton on /projects topbar; MilestonesPanel + ProjectResourcesPanel + ProjectTeamsPanel on project detail.
9. ✅ **Initiatives + Roadmap** — bucketed list with progress bars, status pills; roadmap has gantt bars with completion fill + today indicator.
10. ✅ **Cycles + cycle detail** — Active/Upcoming/Completed buckets; Complete-cycle CTA on active cycle detail.
11. ✅ **Documents** — listing + per-doc editor stays.
12. ✅ **Customer Requests** — bucketed by status, source pill, link-to-issue affordance, resolve/cancel buttons.
13. ✅ **Triage** — accept/decline rail per row, source pill.
14. ✅ **Settings** — left-pane `SettingsNav` already routes to Members / Labels / Teams / per-team; Members editor now changes role inline.
15. ✅ **Command palette** — recents from localStorage, `in:issues` / `team:ENG` / `@alex` filters, group headers, hint footer.
16. ✅ **Design tokens** — every new component uses `text-*`, `bg-*`, `border-*` tokens from `globals.css`; no raw hex.
17. ✅ **New routes filled in** — `/views`, `/team/[key]/views`, `/team/[key]/projects` were 404s before; all now have real pages.

Out-of-scope for this pass: auth, realtime, Postgres swap, golden-screenshot capture re-run.
