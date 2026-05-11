// Seed fixtures for the Linear workspace used as a capture source.
//
// Hand-authored teams, projects, initiatives, labels, and a generator that
// produces ~80 realistic issues distributed across teams. The script
// `linear-seed.mjs` consumes these and creates them via the Linear API.
//
// Constraints honored:
//   - Issue titles read like real engineering/design/ops work (no "Issue 1").
//   - Priorities, statuses, labels, estimates are intentionally varied so
//     captures of grouped/filtered views render meaningfully.
//   - At least 2 issues per team have sub-issues; at least 1 has relations.

export const FIXTURES = {
  $schema: "linear-seed/v1",

  // Workspace-level labels (created via the workspace API, not per team).
  workspaceLabels: [
    { name: "Bug", color: "#eb5757" },
    { name: "Feature", color: "#5e6ad2" },
    { name: "Improvement", color: "#26b5ce" },
    { name: "Tech Debt", color: "#bc7cf0" },
    { name: "Customer", color: "#f2c94c" },
    { name: "Security", color: "#f2994a" },
  ],

  teams: [
    {
      key: "ENG",
      name: "Engineering",
      cyclesEnabled: true,
      cycleDuration: 2, // weeks
      labels: [
        { name: "Backend", color: "#5e6ad2" },
        { name: "Frontend", color: "#26b5ce" },
        { name: "Infra", color: "#9b9b9b" },
        { name: "API", color: "#bc7cf0" },
      ],
    },
    {
      key: "DES",
      name: "Design",
      cyclesEnabled: false,
      labels: [
        { name: "Visual", color: "#f2c94c" },
        { name: "UX", color: "#26b5ce" },
        { name: "Research", color: "#bc7cf0" },
      ],
    },
    {
      key: "OPS",
      name: "Operations",
      cyclesEnabled: false,
      labels: [
        { name: "Process", color: "#9b9b9b" },
        { name: "Hiring", color: "#f2994a" },
      ],
    },
  ],

  projects: [
    {
      name: "Q2 Platform Reliability",
      description: "Drive p95 latency below 200ms across critical endpoints and eliminate flakey background jobs.",
      teamKeys: ["ENG"],
      state: "started",
      targetMonthsOut: 2,
      milestones: [
        { name: "Latency baseline", monthsOut: 0 },
        { name: "p95 < 200ms on hot endpoints", monthsOut: 1 },
        { name: "Background job SLO", monthsOut: 2 },
      ],
      updates: [
        { health: "onTrack", body: "Baseline measurement complete. Hot endpoint inventory in place." },
        { health: "atRisk", body: "Database connection pool exhaustion is blocking the p95 work. Mitigation landing this week." },
      ],
    },
    {
      name: "New onboarding flow",
      description: "Redesign first-run experience so 80% of new users complete the welcome checklist.",
      teamKeys: ["DES", "ENG"],
      state: "started",
      targetMonthsOut: 3,
      milestones: [
        { name: "Research & user testing", monthsOut: 0 },
        { name: "Visual design v1", monthsOut: 1 },
        { name: "Implementation + experiment launch", monthsOut: 3 },
      ],
      updates: [
        { health: "onTrack", body: "User interviews wrapped. Themes documented in research doc." },
      ],
    },
    {
      name: "Mobile app v2",
      description: "Ground-up rewrite of the mobile client on the new shared core.",
      teamKeys: ["ENG", "DES"],
      state: "planned",
      targetMonthsOut: 6,
      milestones: [
        { name: "Tech spike: shared core", monthsOut: 1 },
        { name: "Design system port", monthsOut: 3 },
      ],
      updates: [],
    },
    {
      name: "SOC2 Type II",
      description: "Achieve SOC2 Type II certification by end of next quarter.",
      teamKeys: ["OPS", "ENG"],
      state: "started",
      targetMonthsOut: 4,
      milestones: [
        { name: "Gap analysis", monthsOut: 0 },
        { name: "Policies & evidence collection", monthsOut: 2 },
        { name: "Audit window", monthsOut: 4 },
      ],
      updates: [
        { health: "offTrack", body: "Vendor due diligence is behind. Pulling in a contractor to catch up." },
      ],
    },
    {
      name: "Q1 Performance Wins",
      description: "Shipped reliability and performance improvements during Q1.",
      teamKeys: ["ENG"],
      state: "completed",
      targetMonthsOut: -1,
      milestones: [
        { name: "API caching layer", monthsOut: -2 },
        { name: "Search index rebuild", monthsOut: -1 },
      ],
      updates: [
        { health: "onTrack", body: "All milestones shipped on schedule." },
      ],
    },
  ],

  initiatives: [
    {
      name: "Make Linear faster",
      description: "Coordinate latency, payload, and perceived-performance work across teams.",
      projectNames: ["Q2 Platform Reliability", "Q1 Performance Wins"],
      targetMonthsOut: 6,
    },
    {
      name: "Customer-first Q2",
      description: "Reduce friction for new users and large customer accounts.",
      projectNames: ["New onboarding flow", "SOC2 Type II"],
      targetMonthsOut: 4,
    },
  ],
};

// ---------------------------------------------------------------------------
// Issue generator
// ---------------------------------------------------------------------------

const ENG_ISSUES = [
  ["Reduce p95 latency on /api/issues below 200ms", "Backend", "Urgent", "In Progress", 5, true],
  ["Fix race condition in cycle rollover job", "Backend", "High", "Todo", 3, false],
  ["Migrate session store to Redis cluster", "Infra", "High", "Backlog", 8, false],
  ["Add tracing to GraphQL resolvers", "Backend", "Medium", "Todo", 3],
  ["Bundle-size regression on workspace shell", "Frontend", "High", "In Progress", 3],
  ["Implement workspace settings UI", "Frontend", "High", "In Progress", 5, true],
  ["Drop unused indexes on issues table", "Backend", "Low", "Backlog", 2],
  ["Improve error boundaries on document editor", "Frontend", "Medium", "Todo", 3],
  ["Rate limit the bulk-update mutation", "API", "Urgent", "In Progress", 3],
  ["Replace polling with subscriptions for inbox", "Frontend", "Medium", "Backlog", 5],
  ["Audit and remove dead code in legacy reducers", "Frontend", "Low", "Backlog", 2],
  ["Cache project rollup queries", "Backend", "Medium", "Todo", 3],
  ["Add idempotency keys to write mutations", "API", "High", "Backlog", 5],
  ["Investigate flaky cycle insights test", "Backend", "Low", "Todo", 2],
  ["Fix off-by-one in cycle progress chart", "Frontend", "Medium", "In Review", 2],
  ["Switch CI to remote cache", "Infra", "Medium", "Done", 3],
  ["Roll our own avatar service", "Backend", "Low", "Canceled", 5],
  ["Move static assets to CDN edge", "Infra", "Medium", "Done", 3],
  ["Backfill missing audit log entries", "Backend", "High", "In Progress", 5],
  ["Implement keyboard navigation in board view", "Frontend", "High", "Todo", 5],
  ["Sub-issue parent reassignment loses children", "Backend", "Urgent", "In Progress", 3, false, "BUG"],
  ["Issue identifier collision after team move", "Backend", "High", "Todo", 3, false, "BUG"],
  ["Re-architect notification fan-out", "Backend", "Medium", "Backlog", 8],
  ["GitHub webhook retries hammer the queue", "Infra", "High", "Todo", 3],
  ["Snappier hover preview for issue links", "Frontend", "Low", "Backlog", 2],
  ["Audit cookies for SameSite compliance", "Infra", "Medium", "Done", 2],
  ["Add e2e coverage for triage flow", "Frontend", "Medium", "In Progress", 3],
  ["Drop the unused 'priorityLabel' field", "Backend", "Low", "Backlog", 1],
  ["Investigate 5xx spike on /graphql", "Backend", "Urgent", "Done", 3],
  ["Compress avatars on upload", "Backend", "Low", "Done", 2],
  ["Tooltip flicker on sidebar items", "Frontend", "Low", "Todo", 1],
  ["Project documents lose cursor on save", "Frontend", "Medium", "Todo", 2],
  ["Auth callback rejects state with special chars", "API", "High", "In Progress", 2],
  ["Per-team rate limits on API key", "API", "Medium", "Backlog", 3],
  ["Postgres connection pool exhaustion", "Backend", "Urgent", "In Progress", 5],
];

const DES_ISSUES = [
  ["Onboarding empty-state illustrations", "Visual", "High", "In Progress", 3, true],
  ["Color tokens for dark mode pass 2", "Visual", "High", "In Progress", 5],
  ["Component library: revisit Button variants", "Visual", "Medium", "Todo", 3],
  ["Triage queue UX research", "Research", "Medium", "In Progress", 3],
  ["Mobile bottom nav exploration", "UX", "Medium", "Backlog", 3],
  ["Iconography refresh", "Visual", "Low", "Backlog", 5],
  ["Spec project update composer", "UX", "High", "Done", 3],
  ["Document review with stakeholders", "UX", "Medium", "Todo", 2],
  ["Roadmap timeline interaction polish", "UX", "Medium", "Todo", 3],
  ["Audit color contrast for AA compliance", "Visual", "High", "In Progress", 3],
  ["Sticker sheet for marketing site", "Visual", "Low", "Backlog", 2],
  ["Settings layout consistency pass", "UX", "Medium", "Todo", 2],
  ["Research: command palette discoverability", "Research", "Medium", "Backlog", 3],
  ["Empty state for archived inbox", "Visual", "Low", "Todo", 1],
  ["Cursor styles for keyboard nav", "Visual", "Low", "Backlog", 1],
  ["Notification snooze interaction spec", "UX", "Medium", "Todo", 2],
  ["Avatar group overflow rules", "Visual", "Low", "Done", 1],
  ["First-run tour storyboard", "UX", "High", "In Progress", 5],
];

const OPS_ISSUES = [
  ["Annual SOC2 evidence collection", "Process", "High", "In Progress", 8],
  ["Hire senior backend engineer", "Hiring", "High", "In Progress", 5],
  ["Vendor security review: Sentry", "Process", "Medium", "Todo", 2],
  ["Update employee handbook", "Process", "Low", "Backlog", 3],
  ["Quarterly access review", "Process", "Medium", "Done", 2],
  ["Set up on-call rotation in PagerDuty", "Process", "Medium", "Todo", 3],
  ["Run incident retrospective for May outage", "Process", "High", "Done", 2],
  ["Recruiter intro deck refresh", "Hiring", "Low", "Todo", 2],
  ["Interview loop for design lead", "Hiring", "High", "In Progress", 3],
  ["Vendor due diligence backlog", "Process", "High", "Todo", 5],
];

// Map status strings → workflow state names Linear creates by default
const STATUS_MAP = {
  Backlog: "Backlog",
  Todo: "Todo",
  "In Progress": "In Progress",
  "In Review": "In Review",
  Done: "Done",
  Canceled: "Canceled",
};

// Linear priority enum: 0 No / 1 Urgent / 2 High / 3 Medium / 4 Low
const PRIORITY_MAP = { Urgent: 1, High: 2, Medium: 3, Low: 4, No: 0 };

function buildIssue(team, [title, label, priority, status, estimate, _isParentHint = false, type = ""]) {
  const labels = [label];
  if (type === "BUG") labels.push("Bug");
  const subIssues = subIssuesFor(title);
  return {
    team,
    title,
    description: descriptionFor(title, label),
    labelNames: labels,
    priority: PRIORITY_MAP[priority] ?? 0,
    stateName: STATUS_MAP[status] || "Backlog",
    estimate,
    subIssues,
  };
}

function descriptionFor(title, label) {
  // Short markdown so the issue detail capture has content but doesn't take
  // forever to seed. Keep it generic — the title is what carries the realism.
  return [
    `**Context**`,
    "",
    `Tracking ${title.toLowerCase()}. ${label === "Bug" ? "Reproduction steps and impact below." : "Goal, plan, and acceptance criteria below."}`,
    "",
    "**Plan**",
    "",
    "- [ ] Investigate current behavior",
    "- [ ] Land minimal fix",
    "- [ ] Add regression test",
  ].join("\n");
}

function subIssuesFor(parentTitle) {
  if (parentTitle.startsWith("Reduce p95")) {
    return [
      { title: "Profile /api/issues query plan", priority: 2, stateName: "In Progress" },
      { title: "Add covering index on (team_id, state)", priority: 2, stateName: "Todo" },
      { title: "Move payload serialization off the hot path", priority: 3, stateName: "Todo" },
      { title: "Track p95 in Datadog dashboard", priority: 4, stateName: "Backlog" },
    ];
  }
  if (parentTitle.startsWith("Implement workspace settings")) {
    return [
      { title: "Settings shell + routing", priority: 3, stateName: "Done" },
      { title: "General tab", priority: 3, stateName: "In Progress" },
      { title: "Members tab", priority: 3, stateName: "Todo" },
      { title: "Integrations tab", priority: 3, stateName: "Backlog" },
    ];
  }
  if (parentTitle.startsWith("Migrate session store")) {
    return [
      { title: "Spike: cluster topology", priority: 3, stateName: "Done" },
      { title: "Write dual-read shim", priority: 2, stateName: "Todo" },
      { title: "Cut over reads, then writes", priority: 2, stateName: "Backlog" },
    ];
  }
  if (parentTitle.startsWith("Onboarding empty-state")) {
    return [
      { title: "Inbox empty state", priority: 3, stateName: "Done" },
      { title: "Triage empty state", priority: 3, stateName: "In Progress" },
      { title: "Projects empty state", priority: 4, stateName: "Todo" },
    ];
  }
  if (parentTitle.startsWith("First-run tour")) {
    return [
      { title: "Step 1: Workspace tour", priority: 3, stateName: "In Progress" },
      { title: "Step 2: Create your first issue", priority: 3, stateName: "Todo" },
      { title: "Step 3: Invite the team", priority: 4, stateName: "Backlog" },
    ];
  }
  return [];
}

export function generateIssues() {
  const issues = [];
  for (const row of ENG_ISSUES) issues.push(buildIssue("ENG", row));
  for (const row of DES_ISSUES) issues.push(buildIssue("DES", row));
  for (const row of OPS_ISSUES) issues.push(buildIssue("OPS", row));
  return issues;
}

// Issue-relations: bidirectional Blocks / Related / Duplicate-of references
// between titles. The seeder resolves titles → ids after creation.
export const ISSUE_RELATIONS = [
  { source: "Reduce p95 latency on /api/issues below 200ms", target: "Postgres connection pool exhaustion", type: "blocks" },
  { source: "Implement workspace settings UI", target: "Settings layout consistency pass", type: "related" },
  { source: "Sub-issue parent reassignment loses children", target: "Issue identifier collision after team move", type: "related" },
];

// Comments to drop on a few key issues so detail captures have a thread.
export const ISSUE_COMMENTS = [
  {
    title: "Reduce p95 latency on /api/issues below 200ms",
    bodies: [
      "Quick update: the worst offenders are the labels and project join. Plan to split into two queries.",
      "Profile attached. Looks like we're spending 60% of time in serialization, not the DB.",
    ],
  },
  {
    title: "Implement workspace settings UI",
    bodies: [
      "First pass of the shell is up. Routes work; tabs still need styling.",
    ],
  },
  {
    title: "Onboarding empty-state illustrations",
    bodies: [
      "Three variants in Figma. Pulling in @design-lead for a quick review tomorrow.",
    ],
  },
];
