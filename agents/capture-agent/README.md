# capture-agent

Playwright-driven screenshot/DOM/styles harvester for Linear. Reads
`research/capture-plan.yaml`, walks every entry through a real browser, and
writes per-entry artifacts to `research/screenshots/<area>/`.

## What it captures (per entry, per theme)

| File | Purpose |
| --- | --- |
| `<id>.<theme>.png` | Full-page screenshot |
| `<id>.<theme>.html` | DOM snapshot (post-hydration) |
| `<id>.<theme>.a11y.json` | Accessibility tree |
| `<id>.<theme>.styles.json` | Computed styles for `selectors_of_interest` |
| `<id>.<theme>.tokens.json` | All CSS custom properties on `:root` / `body` |
| `<id>.<theme>.animations.json` | Transition + animation timing for interactive nodes |
| `<id>.<theme>.video.webm` | ~2s clip covering nav steps (for animation keyframes) |
| `<id>.<theme>.state-<state>.png` | Per-state shots for `button-states` entries |

## Prerequisites

```bash
# from repo root — installs playwright + js-yaml into the agent workspace
pnpm install

# install Chromium for Playwright (one-time)
pnpm --filter @saas-clone-factory/capture-agent exec playwright install chromium
```

## One-time login

```bash
pnpm capture:login
```

A headed browser opens at `linear.app/login`. Log in (email + magic link or
SSO — whatever your workspace uses). Once the URL settles on a
post-login path, the runner saves cookies + localStorage to
`.auth/linear.json` and closes. This file is gitignored.

## Discovery (placeholder resolution)

The plan uses placeholders like `{workspace}`, `{team}`, `{project}`,
`{issue}`. After login, the runner auto-discovers values by sniffing the
sidebar and your team's active view. Discovery runs automatically on the
first capture pass and persists to `.auth/discovery.json`.

To re-run discovery (e.g., after creating new teams/projects):

```bash
pnpm capture:discover
```

If any placeholder ends up blank, **edit `.auth/discovery.json` by hand**
before capturing those entries. The runner won't fail hard on missing
placeholders, but it will skip / 404 the affected entries.

## Run a capture

```bash
# everything in the plan (both themes, all areas)
pnpm capture

# one area
pnpm capture -- --only auth
pnpm capture -- --only issues

# multiple areas
pnpm capture -- --only workspace,issues

# single entry
pnpm capture -- --only issues.team.active

# theme override
pnpm capture -- --themes dark

# debugging
pnpm capture -- --headed --max 3 --no-video
```

Flags:

| Flag | Effect |
| --- | --- |
| `--only <list>` | Comma-separated areas or entry ids |
| `--themes <list>` | Override the plan's themes (`light` / `dark`) |
| `--headed` | Show the browser |
| `--no-video` | Skip per-entry video recording (much faster) |
| `--max <n>` | Stop after N entries (for debugging) |
| `--discover` | Re-run placeholder discovery before capturing |

## Outputs

```
research/
├── capture-plan.yaml             # source of truth (this is the input)
├── capture-log.jsonl             # one JSON line per entry+theme
└── screenshots/
    └── <area>/
        ├── <id>.<theme>.png
        ├── <id>.<theme>.html
        ├── <id>.<theme>.a11y.json
        ├── <id>.<theme>.styles.json
        ├── <id>.<theme>.tokens.json
        ├── <id>.<theme>.animations.json
        └── <id>.<theme>.video.webm
```

`research/screenshots/` and `.auth/` are both gitignored.

## Reading the log

`research/capture-log.jsonl` is one record per `entry × theme`:

```json
{"ts":"2025-…","id":"issues.team.active","area":"issues","theme":"dark","status":"ok","duration_ms":4123,"error":null}
```

To inspect failures:

```bash
# (PowerShell) — last 20 errors
Get-Content research\capture-log.jsonl | Where-Object { $_ -match '"status":"error"' } | Select-Object -Last 20

# (bash) — same
grep '"status":"error"' research/capture-log.jsonl | tail -20
```

`retry_optional: true` in the plan marks entries that are best-effort
(surface may not exist in every workspace). They retry once on failure but
don't count against a clean run.

## Adding new captures

1. Add an entry to `research/capture-plan.yaml` under the appropriate area
   (or add a new area).
2. Run `pnpm capture -- --only <id>` to verify.
3. Commit only the plan change — outputs stay gitignored.

## Troubleshooting

- **"No storage state at .auth/linear.json"** — run `pnpm capture:login`.
- **Many entries 404** — `.auth/discovery.json` is stale. Run
  `pnpm capture:discover` or edit it by hand.
- **Selectors don't match** — Linear's class names rotate. Use the captured
  `<id>.html` as the source of truth, update the selectors in the plan,
  and re-run that entry.
- **Login times out** — the runner watches the URL for ~5 minutes. If your
  flow takes longer (SSO with MFA prompts), re-run `--login` and complete
  faster, or extend the timeout in `runLogin()`.
- **Theme not switching** — `applyTheme()` sets common `localStorage` keys
  and emulates the `prefers-color-scheme` media query. If Linear ignores
  both, you'll need to add the actual key Linear uses to `applyTheme()`.
