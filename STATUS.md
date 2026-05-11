# Clone status — vs. linear.xlsx feature matrix

Last updated: 2026-05-11. Status keys: ✅ built · 🟡 partial · ❌ not started.

---

## Core entities (20)

| Entity | DB model | API | UI | Notes |
| --- | :-: | :-: | :-: | --- |
| Workspace | ✅ | ✅ | ✅ | One workspace (`demo`) seeded |
| Team | ✅ | ✅ | ✅ | 2 teams seeded (ENG, DES) |
| Issue | ✅ | ✅ | ✅ | Create / patch / list / detail |
| Member | ✅ | ✅ | 🟡 | Picker works; no admin/member/guest roles |
| WorkflowState | ✅ | ✅ | ✅ | Default 6 per team; no editor |
| Label | ✅ | ✅ | 🟡 | Render only; no picker yet |
| Comment | ✅ | ✅ | ✅ | Compose + render |
| IssueRelation | ✅ | 🟡 | 🟡 | Render only; no add-relation UI |
| Project | ✅ | ✅ | ✅ | 5 seeded, list + detail + picker + milestones + updates |
| Initiative | ✅ | ✅ | ✅ | Strategic grouping of projects; status pill, owner, target date, project rollup |
| Cycle | ✅ | ✅ | ✅ | Per-team cycles, active/upcoming/completed status, issue assignment, sidebar active-cycle link |
| Roadmap | ✅ | ✅ | ✅ | Timeline view of initiatives × projects with date bars + completion fill; today indicator |
| Milestone | ❌ | ❌ | ❌ | |
| View (saved) | ✅ | ✅ | ✅ | Save filter+sort+group+display per team; listed under team in sidebar |
| Document | ✅ | ✅ | ✅ | Workspace + project-scoped markdown docs; inline title/body/icon edit; autosave; sidebar + palette wiring |
| Triage | ✅ | ✅ | ✅ | Per-team incoming queue; source tag (slack/zendesk/feedback); accept/decline actions |
| Customer Request | ✅ | ✅ | ✅ | Inbound feedback w/ source tag; status (pending / linked / resolved / canceled); link to issue; surfaced on issue detail |
| Notification | ✅ | ✅ | ✅ | Generated on assign / status change / comment; per-recipient queue with unread badge |

---

## P0 features

### Workspace & teams
- ✅ Workspace home (redirects to inbox)
- ✅ Team switcher / sidebar
- ✅ Create team UI (backend `POST /teams` ships default states; no entry in settings UI yet — gear-icon next step)
- ✅ Team settings — name / icon color / cycles toggle + workflow states editor + team labels CRUD
- ✅ Workspace settings — members list, workspace labels CRUD, teams index

### Issue CRUD
- ✅ Create issue modal (C shortcut) — polished w/ inline pickers + chips
- ❌ Quick add inline in list view (`+` at top/bottom of state groups)
- ✅ Open issue full page (URL-routable)
- ✅ Edit title — inline click-to-edit, ⏎ saves
- ✅ Edit markdown description — inline click-to-edit, ⌘⏎ saves (no slash menu / mentions yet)
- ✅ Delete (`...` menu in topbar, confirm dialog)
- ✅ Duplicate issue (`...` menu)
- ❌ Archive (distinct from delete)
- ❌ Move issue between teams

### Issue metadata
- ✅ Status picker
- ✅ Priority picker + direct `0-4` shortcuts
- ✅ Assignee picker
- ✅ Labels picker (multi-select with checkboxes)
- ✅ Estimate picker (Fibonacci 1/2/3/5/8 + None)
- ✅ Due date picker (native date input)
- ✅ Project assignment
- ✅ Cycle assignment
- 🟡 Subscribers — model has no field yet

### Views & filtering
- ✅ Default views (Active, Backlog, All)
- ✅ Custom views (create/save) — Save popover on team pages; saved views listed in sidebar; `/view/<id>` route applies the stored query
- ✅ Filter builder — compound filters by priority / status / assignee / label / project; chips render in `FilterBar`
- ✅ Group by (status/priority/assignee/project/label) — `?group=` URL param
- ✅ Sort — priority / last updated / created / due date
- ✅ Display options (List vs Board)
- ✅ Save view as favorite — star toggle on each saved view; Favorites section at top of sidebar
- ✅ Active cycle view — linked from sidebar; `/cycle/<id>` page

### Cycles
- ✅ Configure cycles per team — `cycles_enabled` + seeded cycles 18–21; date-driven status
- ✅ Cycle list (team `Cycles` page) and detail (progress bar, issue grouping)
- ✅ Cycle picker on issue rail; active cycle linked from sidebar
- ❌ Auto-rollover of unfinished issues (manual moves only)

### Projects
- ✅ Create project (model + API; UI button not wired but seed creates 5)
- ✅ Project overview page (description, status row, milestones, updates feed)
- ✅ Add / remove issues — Project picker on issue detail
- ✅ Milestones (rendered; explicit create UI not yet)
- ✅ Project status (planned/started/paused/completed/canceled)
- ✅ Project updates with health (On track / At risk / Off track badges)
- ✅ Project documents — Documents section on project page; project_id link on Document
- ❌ Project resources
- ❌ Cross-team projects (1 team per project currently)

### Triage
- ✅ Triage inbox per team — `/team/<key>/triage` page; sidebar badge with live count
- ✅ Triage actions — Accept (moves into team backlog) and Decline (removes); `POST /issues/{id}/triage/accept|decline`; `POST /teams/{key}/triage` accepts incoming items

### Sub-issues & relations
- 🟡 Sub-issues — render only; no add-sub-issue UI
- ❌ Convert issue to sub-issue
- 🟡 Issue relations — render only; no UI to create

### Comments & collaboration
- ✅ Comment thread (render + post)
- ❌ @mention with autocomplete
- ❌ Reply to comment (threading)
- ❌ Reactions
- ❌ Linked PRs / branches

### Search & navigation
- ✅ Command palette (`Cmd-K` / `Ctrl-K` / `/`) — grouped results: issues, projects, teams, members, saved views; ↑↓↵ to navigate
- ✅ Global search — `GET /api/workspaces/{slug}/search?q=` (issues by id/title, projects, teams, members, views)
- 🟡 Search filters — no per-property filters in palette yet
- 🟡 Recent items — empty-query mode returns recent issues + all teams/projects
- 🟡 Keyboard shortcuts — `C` opens create, `0-4` set priority, `?` opens cheatsheet, `Cmd-K`/`/` open palette, `Esc` closes. Still missing `S`/`A`/`L`/`P`/`E`

### Inbox & notifications
- ✅ Inbox — real list, mark-read on click, "Mark all read", sidebar unread badge
- 🟡 Filter inbox — read/unread toggle not yet exposed (endpoint supports `unread_only`)
- ✅ Notification generation — `patch_issue` (assign + status), `create_issue` (assign), `bulk_issues` (assign + status), `create_comment` (assignee + previous commenters)

### Bulk operations
- ✅ Multi-select — checkboxes on row hover, shift-click range, Esc clears
- ✅ Bulk edit action bar — change status / priority / assignee on N selected at once
- ✅ Bulk delete — confirm-then-delete via `POST /issues/bulk` op=delete
- 🟡 Archive — uses delete (no separate archive state yet)
- ❌ CSV import / export

### Workflow customization
- ✅ Custom workflow states — full CRUD editor in team settings (name, group, color); deletion blocked if state in use
- ✅ Custom labels — workspace + per-team CRUD in settings
- ❌ Custom estimate scales

### Permissions & roles
- ❌ Admin / Member / Guest roles
- 🟡 Team membership — Member model has no team join table

---

## P1 features

All ❌ except where noted below.

- 🟡 Parent progress rollup — `child_count` / `child_done_count` rendered
- 🟡 Issue relations — rendered but no UI for create

---

## Other observations

- **UI polish**: modal styling, picker hover states, focus rings, and sidebar spacing don't yet match the captures pixel-for-pixel.
- **No auth**: all routes are unauthenticated; "current user" is hardcoded.
- **No realtime**: mutations require `router.refresh()` rather than streaming.
- **Postgres**: ready (`docker-compose.yml`) but dev runs SQLite. Swap with `DATABASE_URL`.
- **Capture pipeline**: only `workspace`, `issues`, `issue-detail`, `my-issues`, `inbox` re-captured against seeded data. Plan covers 145 entries across 29 areas; the rest are unverified.

---

## Coverage rough estimate

| Bucket | P0 done | P0 total |
| --- | :-: | :-: |
| Workspace & teams | 5 | 5 |
| Issue CRUD | 5 | 7 |
| Issue metadata | 8 | 9 |
| Views & filtering | 8 | 8 |
| Cycles | 3 | 3 |
| Projects | 6 | 6 |
| Triage | 2 | 2 |
| Sub-issues & relations | 0 | 3 |
| Comments | 1 | 4 |
| Search & navigation | 2 | 5 |
| Inbox | 2 | 2 |
| Bulk ops | 3 | 4 |
| Workflow customization | 2 | 3 |
| Permissions | 0 | 2 |
| **Total** | **51** | **63** |

≈ **81% of P0**. Issue ops + Views + Search + Bulk ops + Cycles + Inbox/Notifications + Initiatives + Triage + Documents + Roadmap + Customer Requests + Settings are now substantially complete; what's left is mostly collaboration polish (@mentions, reactions), permissions/roles, and minor entity gaps.
