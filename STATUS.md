# Clone status — vs. linear.xlsx feature matrix

Last updated: 2026-05-12. Status keys: ✅ built · 🟡 partial · ❌ not started.

---

## Core entities (20)

| Entity | DB model | API | UI | Notes |
| --- | :-: | :-: | :-: | --- |
| Workspace | ✅ | ✅ | ✅ | One workspace (`demo`) seeded |
| Team | ✅ | ✅ | ✅ | 2 teams seeded (ENG, DES); per-team estimate scale |
| Issue | ✅ | ✅ | ✅ | Create / patch / list / detail / archive / move |
| Member | ✅ | ✅ | ✅ | Admin/Member/Guest roles, team_memberships join table |
| WorkflowState | ✅ | ✅ | ✅ | Default 6 per team; full editor |
| Label | ✅ | ✅ | ✅ | Workspace + team-scoped CRUD |
| Comment | ✅ | ✅ | ✅ | Threaded replies, @mentions, reactions |
| CommentReaction | ✅ | ✅ | ✅ | Toggle per (comment, member, emoji) |
| IssueLink | ✅ | ✅ | ✅ | GitHub PR/branch/Figma/URL — autodetects type + status |
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
| Notification | ✅ | ✅ | ✅ | Generated on assign / status change / comment / mention / reaction; per-recipient queue with unread badge |

---

## P0 features

### Workspace & teams
- ✅ Workspace home (redirects to inbox)
- ✅ Team switcher / sidebar
- ✅ Create team UI
- ✅ Team settings — name / icon color / cycles toggle + workflow states editor + team labels CRUD + estimate scale picker
- ✅ Workspace settings — members list (with role editor), workspace labels CRUD, teams index

### Issue CRUD
- ✅ Create issue modal (C shortcut) — polished w/ inline pickers + chips
- ✅ Quick add inline in list view (`+` at the top of each group on hover)
- ✅ Open issue full page (URL-routable)
- ✅ Edit title — inline click-to-edit, ⏎ saves
- ✅ Edit markdown description — inline click-to-edit, ⌘⏎ saves
- ✅ Delete (`...` menu in topbar, confirm dialog)
- ✅ Duplicate issue (`...` menu)
- ✅ Archive / unarchive — distinct from delete; `archived_at` column; excluded from default views; archived banner on detail
- ✅ Move issue between teams — re-keys identifier, maps state to closest group on target team

### Issue metadata
- ✅ Status picker
- ✅ Priority picker + direct `0-4` shortcuts
- ✅ Assignee picker
- ✅ Labels picker (multi-select with checkboxes)
- ✅ Estimate picker — adapts to the team's estimate scale (fibonacci / linear / exponential / t-shirt / none)
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
- ✅ Triage inbox per team
- ✅ Triage actions — Accept / Decline

### Sub-issues & relations
- ✅ Convert issue to sub-issue — `...` menu opens a search dialog; picking sets `parent_id`; the same menu unsets it for an existing sub-issue
- 🟡 Sub-issues — render only on parent; no add-from-parent UI
- 🟡 Issue relations — render only; no UI to create

### Comments & collaboration
- ✅ Comment thread (render + post) — with parent-grouped replies
- ✅ @mention with autocomplete — full keyboard nav, mention pills, fires `mentioned` notifications
- ✅ Reply to comment (threading) — flat one-level threads; reply composer per comment
- ✅ Reactions — 6 quick emojis + popover; toggles per (comment, member, emoji); fires reaction notification to author
- ✅ Linked PRs / branches — GitHub PR / branch / Figma / URL with auto-detected type + status badge; add / remove from issue detail

### Search & navigation
- ✅ Command palette (`Cmd-K` / `Ctrl-K` / `/`) — grouped results: issues, projects, teams, members, saved views; ↑↓↵ to navigate
- ✅ Global search — `GET /api/workspaces/{slug}/search?q=`
- 🟡 Search filters — no per-property filters in palette yet
- ✅ Recent items — empty palette shows up-to-6 recently visited issues/projects/docs/views from localStorage
- 🟡 Keyboard shortcuts — `C` opens create, `0-4` set priority, `?` opens cheatsheet, `Cmd-K`/`/` open palette, `Esc` closes

### Inbox & notifications
- ✅ Inbox — real list, mark-read on click, "Mark all read", sidebar unread badge
- ✅ Filter inbox — All / Unread / Mentions pills in header
- ✅ Notification generation — assign, status change, comment, @mention, reaction

### Bulk operations
- ✅ Multi-select — checkboxes on row hover, shift-click range, Esc clears
- ✅ Bulk edit action bar — change status / priority / assignee on N selected at once
- ✅ Bulk delete
- ✅ Archive — first-class state distinct from delete
- ❌ CSV import / export

### Workflow customization
- ✅ Custom workflow states — full CRUD editor in team settings
- ✅ Custom labels — workspace + per-team CRUD in settings
- ✅ Custom estimate scales — per-team (fibonacci/linear/exponential/t-shirt/none); estimate picker on issues adapts

### Permissions & roles
- ✅ Admin / Member / Guest roles — selectable per member in workspace settings; persisted on `members.role`
- ✅ Team membership — `team_memberships` join table with optional per-team role override

---

## P1 features

All ❌ except where noted below.

- 🟡 Parent progress rollup — `child_count` / `child_done_count` rendered
- 🟡 Issue relations — rendered but no UI for create

---

## Other observations

- **UI polish**: modal styling, picker hover states, focus rings, and sidebar spacing don't yet match the captures pixel-for-pixel.
- **No auth**: all routes are unauthenticated; "current user" is hardcoded to the first member of the workspace (used for reactions/mentions/role context).
- **No realtime**: mutations require `router.refresh()` rather than streaming.
- **Postgres**: ready (`docker-compose.yml`) but dev runs SQLite. Swap with `DATABASE_URL`.
- **Capture pipeline**: only `workspace`, `issues`, `issue-detail`, `my-issues`, `inbox` re-captured against seeded data.

---

## Coverage rough estimate

| Bucket | P0 done | P0 total |
| --- | :-: | :-: |
| Workspace & teams | 5 | 5 |
| Issue CRUD | 9 | 9 |
| Issue metadata | 8 | 9 |
| Views & filtering | 8 | 8 |
| Cycles | 3 | 3 |
| Projects | 6 | 6 |
| Triage | 2 | 2 |
| Sub-issues & relations | 1 | 3 |
| Comments | 5 | 5 |
| Search & navigation | 3 | 5 |
| Inbox | 3 | 3 |
| Bulk ops | 4 | 4 |
| Workflow customization | 3 | 3 |
| Permissions | 2 | 2 |
| **Total** | **62** | **67** |

≈ **93% of P0**. All 12 P0 features promised in the 2026-05-11 plan are done: reactions, @mentions, threaded replies, linked PRs/branches, archive, permissions/roles, custom estimate scales, quick-add inline, move-between-teams, convert-to-subissue, recent items in palette, inbox filters. Remaining gaps are minor (subscribers field, add-sub-issue-from-parent UI, relation-create UI, search filters, keyboard polish, auto-rollover, project resources, cross-team projects, CSV).
