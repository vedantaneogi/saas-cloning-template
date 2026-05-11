# Linear workspace seeding checklist

The capture pipeline targets a real Linear workspace. A fresh workspace has
4 onboarding issues and nothing else, so ~60% of the capture plan would
hit empty or missing surfaces. This checklist gets the source workspace to
a state where every plan entry has something realistic to capture.

## What gets seeded

| Entity | Count | Why |
| --- | --- | --- |
| Workspace labels | 6 | Bug / Feature / Improvement / Tech Debt / Customer / Security — for filter & label-picker captures |
| Teams | 3 (`ENG`, `DES`, `OPS`) | Multi-team navigation, cross-team projects, team switcher |
| Team labels | 9 total | Per-team label autocomplete with grouping |
| Projects | 5 | Mix of started / planned / completed / paused so each project status filter renders |
| Milestones | ~14 | Project milestone groupings + roadmap |
| Project updates | ~5 | Health badges (on track / at risk / off track) |
| Initiatives | 2 | Initiative rollup + roadmap grouping (Plus plan required) |
| Issues | ~63 | Mix of priorities, statuses, labels, estimates across teams |
| Sub-issues | ~17 | Parent-progress rollup, sub-issue indentation |
| Issue relations | 3 | Blocks / Related rendering |
| Comments | ~5 | Thread + activity feed in issue detail |

After seeding, your workspace will have enough variety that filter,
group-by, board view, insights, and project-detail captures all render
meaningfully.

## Option A — API seeder (recommended)

The script lives at `scripts/seed/linear-seed.mjs`. It hits Linear's
GraphQL API directly, is idempotent (safe to re-run), and takes ~2 minutes.

### 1. Create a Linear API key

1. Open your Linear workspace in a browser (you're already logged in).
2. Go to **Settings → Account → Security & access** → **Personal API keys**
   (URL: `linear.app/<workspace>/settings/account/security`).
3. Click **New API key**, give it a label like `clone-factory-seed`,
   copy the key (`lin_api_…`). It is shown only once.

### 2. Run the seeder

PowerShell:

```powershell
$env:LINEAR_API_KEY = "lin_api_xxxxxxxxxxxx"
pnpm seed:linear
```

Bash:

```bash
LINEAR_API_KEY=lin_api_xxxxxxxxxxxx pnpm seed:linear
```

Dry-run first if you want to see the staged plan without calling the API:

```powershell
pnpm seed:linear -- --dry-run
```

Re-run safely: items that already exist (by name/key) are skipped.

### 3. Refresh discovery and re-capture

After seeding, your placeholders should resolve to the new richer
entities. Refresh and re-run capture:

```powershell
pnpm capture:discover
pnpm capture --only workspace,issues
```

### Flags

| Flag | Effect |
| --- | --- |
| `--dry-run` | Print the stage plan without calling the API |
| `--only <stages>` | Comma list: `labels,teams,team_labels,projects,initiatives,issues,relations,comments` |
| `--no-comments` | Skip the comments stage |

### Known gotchas

- **Initiatives** require Linear's Plus plan. Free / Standard workspaces
  will see a warning at the initiatives stage and skip; everything else
  continues.
- **Cycles**: the seeder enables cycles on `ENG` but does not create
  cycles themselves (Linear auto-generates them based on team config).
  If you want a populated active cycle, create one manually in
  `Settings → ENG → Cycles` after seeding.
- **Custom workflow states**: the seeder uses Linear's default per-team
  states (Backlog / Todo / In Progress / In Review / Done / Canceled).
  Adding custom states is a manual step in `Settings → ENG → Workflow`.
- **Triage queue**: Linear's free plan doesn't expose Triage. On plans
  that do, create issues without a team via the Slack integration or
  email-in to populate it.

## Option B — Manual UI seeding (fallback)

Use this if you can't or don't want to use the API. Slower, but no API
key needed.

### Steps

1. **Create labels** at `Settings → Workspace → Labels`:
   `Bug`, `Feature`, `Improvement`, `Tech Debt`, `Customer`, `Security`.
2. **Create teams** at `Settings → Workspace → Teams → New team`:
   - `ENG` Engineering — enable cycles, 2-week cadence
   - `DES` Design — cycles off
   - `OPS` Operations — cycles off
3. **Create per-team labels** at `Settings → <team> → Labels`:
   - ENG: Backend, Frontend, Infra, API
   - DES: Visual, UX, Research
   - OPS: Process, Hiring
4. **Create issues**: easiest path is **CSV import**.
   - Open `Settings → Workspace → Import / Export → Import → CSV`.
   - Use any spreadsheet tool to draft ~20 issues per team with columns:
     `Title, Description, Priority (Urgent/High/Medium/Low), Status, Labels (semi-colon separated), Estimate, Assignee`.
   - Or hand-create them: `C` opens the create modal everywhere.
5. **Create projects** at `Workspace → Projects → New project`. Five
   projects, one of each status, with 2–3 milestones each.
6. **Create initiatives** at `Workspace → Initiatives → New initiative`
   (Plus plan required). Link 2–3 projects per initiative.
7. **Generate activity** so the inbox renders: assign yourself an issue,
   leave a comment, mention `@everyone`.
8. **Optional**: connect GitHub / Slack / Figma so integration captures
   render real content.

## After seeding — verify

```powershell
# Show the resolved placeholders
type .auth\discovery.json

# Capture a single rich surface and inspect it
pnpm capture --only issue-detail.full --max 1 --no-video
```

Open `research/screenshots/issue-detail/issue-detail.full.dark.png` —
you should see sub-issues, labels, comments, and a populated activity
feed. If the page looks empty, your `{issue}` placeholder probably
points at a thin issue; edit `.auth/discovery.json` to point at one of
the parent issues the seeder created (e.g., `ENG-1` after seeding).
