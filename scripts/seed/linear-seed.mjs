#!/usr/bin/env node
// Linear workspace seeder. Creates teams, labels, projects, milestones,
// initiatives, and ~80 realistic issues via the Linear GraphQL API.
//
// Idempotent: queries existing entities by name/key before creating. Safe to
// re-run; existing items are skipped, missing ones are added.
//
// Usage:
//   LINEAR_API_KEY=lin_api_xxx node scripts/seed/linear-seed.mjs
//   LINEAR_API_KEY=lin_api_xxx node scripts/seed/linear-seed.mjs --dry-run
//   LINEAR_API_KEY=lin_api_xxx node scripts/seed/linear-seed.mjs --only teams,labels
//   LINEAR_API_KEY=lin_api_xxx node scripts/seed/linear-seed.mjs --no-comments
//
// Get an API key at: linear.app/{workspace}/settings/api → New personal API key.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FIXTURES, generateIssues, ISSUE_RELATIONS, ISSUE_COMMENTS } from "./seed-fixtures.mjs";

// Load .env from repo root if present — saves the user from exporting the
// key into the shell every run.
function loadDotEnv() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(here, "..", "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m || line.trim().startsWith("#")) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}
loadDotEnv();

const API_URL = "https://api.linear.app/graphql";
const TOKEN = process.env.LINEAR_API_KEY;

const args = parseArgs(process.argv);
if (!args.dryRun && !TOKEN) {
  console.error("LINEAR_API_KEY is not set. Get one at linear.app/<workspace>/settings/api");
  console.error("Or run with --dry-run to validate the script without hitting the API.");
  process.exit(1);
}

function parseArgs(argv) {
  const out = { dryRun: false, only: null, noComments: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-comments") out.noComments = true;
    else if (a === "--only") out.only = new Set(argv[++i].split(",").map((s) => s.trim()));
    else if (a === "--help") {
      console.log(`linear-seed — LINEAR_API_KEY=... node scripts/seed/linear-seed.mjs [flags]
  --dry-run         Print plan, don't call the API
  --only <list>     Comma-separated stages: labels,teams,team_labels,projects,initiatives,issues,relations,comments
  --no-comments     Skip the comments stage
`);
      process.exit(0);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// GraphQL transport
// ---------------------------------------------------------------------------

async function gql(query, variables = {}) {
  if (args.dryRun) {
    return { __dryRun: true, query: query.split("\n")[0].slice(0, 80) };
  }
  let attempt = 0;
  while (true) {
    attempt++;
    const r = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
    if (r.status === 429) {
      const wait = Math.min(60_000, attempt * 2000);
      console.warn(`[rate-limited] waiting ${wait}ms…`);
      await sleep(wait);
      continue;
    }
    const json = await r.json();
    if (json.errors) {
      throw new Error(JSON.stringify(json.errors));
    }
    return json.data;
  }
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Helpers ------------------------------------------------------------------

function shouldRun(stage) {
  return !args.only || args.only.has(stage);
}

function monthsOffset(monthsOut) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsOut);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

async function getViewer() {
  if (args.dryRun) return { id: "dry-viewer", organization: { id: "dry-org", urlKey: "dry" } };
  const d = await gql(`{ viewer { id name email organization { id name urlKey } } }`);
  return d.viewer;
}

async function listTeams() {
  if (args.dryRun) return [];
  const d = await gql(`{
    teams(first: 100) {
      nodes { id key name cyclesEnabled states { nodes { id name type } } }
    }
  }`);
  return d.teams.nodes;
}

async function listWorkspaceLabels() {
  if (args.dryRun) return [];
  const d = await gql(`{
    issueLabels(first: 250, filter: { team: { null: true } }) {
      nodes { id name color }
    }
  }`);
  return d.issueLabels.nodes;
}

async function listTeamLabels(teamId) {
  if (args.dryRun) return [];
  const d = await gql(
    `query($teamId: ID!) { issueLabels(first: 250, filter: { team: { id: { eq: $teamId } } }) { nodes { id name color } } }`,
    { teamId }
  );
  return d.issueLabels.nodes;
}

async function listProjects() {
  if (args.dryRun) return [];
  const d = await gql(`{ projects(first: 100) { nodes { id name state } } }`);
  return d.projects.nodes;
}

async function listInitiatives() {
  if (args.dryRun) return [];
  const d = await gql(`{ initiatives(first: 50) { nodes { id name } } }`).catch(() => ({ initiatives: { nodes: [] } }));
  return d.initiatives?.nodes || [];
}

async function ensureWorkspaceLabels() {
  if (!shouldRun("labels")) return;
  console.log("\n[stage] workspace labels");
  const existing = await listWorkspaceLabels();
  const byName = new Map(existing.map((l) => [l.name.toLowerCase(), l]));
  for (const def of FIXTURES.workspaceLabels) {
    if (byName.has(def.name.toLowerCase())) {
      console.log(`  = ${def.name} (exists)`);
      continue;
    }
    await gql(
      `mutation($input: IssueLabelCreateInput!) { issueLabelCreate(input: $input) { success } }`,
      { input: { name: def.name, color: def.color } }
    );
    console.log(`  + ${def.name}`);
  }
}

async function ensureTeams() {
  if (!shouldRun("teams")) return;
  console.log("\n[stage] teams");
  const existing = await listTeams();
  const byKey = new Map(existing.map((t) => [t.key, t]));
  for (const def of FIXTURES.teams) {
    if (byKey.has(def.key)) {
      console.log(`  = ${def.key} (${def.name}) — exists`);
      continue;
    }
    try {
      await gql(
        `mutation($input: TeamCreateInput!) { teamCreate(input: $input) { success } }`,
        { input: { key: def.key, name: def.name, cyclesEnabled: !!def.cyclesEnabled } }
      );
      console.log(`  + ${def.key} (${def.name})`);
    } catch (e) {
      const msg = shortErr(e);
      const planLimited = /plan|upgrade|forbidden/i.test(msg);
      console.warn(`  ! ${def.key}: ${msg}${planLimited ? "  (plan limit — will fall back issues to an existing team)" : ""}`);
    }
  }
}

async function ensureTeamLabels(teamMap) {
  if (!shouldRun("team_labels")) return;
  console.log("\n[stage] team labels");
  for (const def of FIXTURES.teams) {
    const team = teamMap.get(def.key);
    if (!team) continue;
    const existing = await listTeamLabels(team.id);
    const byName = new Map(existing.map((l) => [l.name.toLowerCase(), l]));
    for (const lbl of def.labels) {
      if (byName.has(lbl.name.toLowerCase())) {
        console.log(`  = ${def.key}/${lbl.name}`);
        continue;
      }
      await gql(
        `mutation($input: IssueLabelCreateInput!) { issueLabelCreate(input: $input) { success } }`,
        { input: { name: lbl.name, color: lbl.color, teamId: team.id } }
      );
      console.log(`  + ${def.key}/${lbl.name}`);
    }
  }
}

async function ensureProjects(orgId, teamMap, viewerId) {
  if (!shouldRun("projects")) return new Map();
  console.log("\n[stage] projects");
  const existing = await listProjects();
  const byName = new Map(existing.map((p) => [p.name.toLowerCase(), p]));
  const created = new Map(existing.map((p) => [p.name, p]));

  for (const def of FIXTURES.projects) {
    const teamIds = def.teamKeys.map((k) => teamMap.get(k)?.id).filter(Boolean);
    if (!teamIds.length) {
      console.warn(`  ! ${def.name} — no resolvable teams`);
      continue;
    }
    let project = byName.get(def.name.toLowerCase());
    if (!project) {
      const r = await gql(
        `mutation($input: ProjectCreateInput!) { projectCreate(input: $input) { success project { id name state } } }`,
        {
          input: {
            name: def.name,
            description: def.description,
            teamIds,
            leadId: viewerId,
            state: def.state, // Linear accepts: planned/started/paused/completed/canceled
            targetDate: monthsOffset(def.targetMonthsOut),
          },
        }
      );
      project = r.projectCreate.project;
      console.log(`  + ${def.name} (${def.state})`);
    } else {
      console.log(`  = ${def.name} — exists`);
    }
    created.set(def.name, project);

    // Milestones
    for (const ms of def.milestones || []) {
      await gql(
        `mutation($input: ProjectMilestoneCreateInput!) { projectMilestoneCreate(input: $input) { success } }`,
        {
          input: {
            projectId: project.id,
            name: ms.name,
            targetDate: monthsOffset(ms.monthsOut),
          },
        }
      ).catch((e) => console.warn(`    ! milestone ${ms.name}: ${shortErr(e)}`));
    }

    // Project updates
    for (const upd of def.updates || []) {
      await gql(
        `mutation($input: ProjectUpdateCreateInput!) { projectUpdateCreate(input: $input) { success } }`,
        { input: { projectId: project.id, body: upd.body, health: upd.health } }
      ).catch((e) => console.warn(`    ! update: ${shortErr(e)}`));
    }
  }
  return created;
}

async function ensureInitiatives(projectMap) {
  if (!shouldRun("initiatives")) return;
  console.log("\n[stage] initiatives");
  const existing = await listInitiatives();
  const byName = new Map(existing.map((i) => [i.name.toLowerCase(), i]));
  for (const def of FIXTURES.initiatives) {
    let init = byName.get(def.name.toLowerCase());
    if (!init) {
      try {
        const r = await gql(
          `mutation($input: InitiativeCreateInput!) { initiativeCreate(input: $input) { success initiative { id name } } }`,
          {
            input: {
              name: def.name,
              description: def.description,
              targetDate: monthsOffset(def.targetMonthsOut),
            },
          }
        );
        init = r.initiativeCreate.initiative;
        console.log(`  + ${def.name}`);
      } catch (e) {
        console.warn(`  ! ${def.name}: ${shortErr(e)} (initiatives may not be enabled on this plan)`);
        continue;
      }
    } else {
      console.log(`  = ${def.name}`);
    }
    // Attach projects
    for (const pname of def.projectNames) {
      const p = projectMap.get(pname);
      if (!p) continue;
      await gql(
        `mutation($id: String!, $input: ProjectUpdateInput!) { projectUpdate(id: $id, input: $input) { success } }`,
        { id: p.id, input: { initiativeId: init.id } }
      ).catch(() => {});
    }
  }
}

async function createIssues(teamMap, viewerId) {
  if (!shouldRun("issues")) return new Map();
  console.log("\n[stage] issues");
  const titleToId = new Map();
  const issues = generateIssues();

  // Build state-name → id maps per team
  const stateMaps = new Map();
  for (const [key, team] of teamMap) {
    const sm = new Map();
    for (const s of team.states?.nodes || []) sm.set(s.name.toLowerCase(), s.id);
    stateMaps.set(key, sm);
  }

  // Build label maps (workspace + per-team) — name → id
  const wsLabels = await listWorkspaceLabels();
  const labelMap = new Map(wsLabels.map((l) => [l.name.toLowerCase(), l.id]));
  for (const [key, team] of teamMap) {
    const team_labels = await listTeamLabels(team.id);
    for (const l of team_labels) labelMap.set(`${key}::${l.name.toLowerCase()}`, l.id);
  }

  // Fallback team: whichever real team exists (prefer ENG > first alphabetical).
  const fallbackTeam =
    teamMap.get("ENG") ||
    [...teamMap.values()].sort((a, b) => a.key.localeCompare(b.key))[0];
  let fallbackWarned = false;

  for (const issue of issues) {
    let team = teamMap.get(issue.team);
    if (!team) {
      if (!fallbackTeam) continue;
      team = fallbackTeam;
      if (!fallbackWarned) {
        console.log(`  (issues for missing teams will land in ${team.key})`);
        fallbackWarned = true;
      }
    }
    const stateId = stateMaps.get(team.key)?.get(issue.stateName.toLowerCase());
    const labelIds = issue.labelNames
      .map((n) => labelMap.get(`${team.key}::${n.toLowerCase()}`) || labelMap.get(n.toLowerCase()))
      .filter(Boolean);

    const r = await gql(
      `mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier title } } }`,
      {
        input: {
          teamId: team.id,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          stateId,
          labelIds,
          assigneeId: issue.stateName !== "Backlog" ? viewerId : undefined,
          estimate: issue.estimate,
        },
      }
    ).catch((e) => {
      console.warn(`  ! ${issue.team} "${issue.title.slice(0, 60)}…": ${shortErr(e)}`);
      return null;
    });
    if (!r) continue;
    const created = r.issueCreate?.issue;
    if (created) {
      titleToId.set(issue.title, created.id);
      console.log(`  + ${created.identifier} ${created.title.slice(0, 60)}`);
    }

    // Sub-issues
    for (const sub of issue.subIssues || []) {
      const subState = stateMaps.get(team.key)?.get(sub.stateName.toLowerCase());
      await gql(
        `mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier } } }`,
        {
          input: {
            teamId: team.id,
            title: sub.title,
            priority: sub.priority,
            stateId: subState,
            parentId: created?.id,
          },
        }
      ).catch((e) => console.warn(`    ! sub "${sub.title}": ${shortErr(e)}`));
    }
  }
  return titleToId;
}

async function createRelations(titleToId) {
  if (!shouldRun("relations")) return;
  console.log("\n[stage] issue relations");
  for (const rel of ISSUE_RELATIONS) {
    const a = titleToId.get(rel.source);
    const b = titleToId.get(rel.target);
    if (!a || !b) continue;
    await gql(
      `mutation($input: IssueRelationCreateInput!) { issueRelationCreate(input: $input) { success } }`,
      { input: { issueId: a, relatedIssueId: b, type: rel.type } }
    ).catch((e) => console.warn(`  ! ${rel.source} ${rel.type} ${rel.target}: ${shortErr(e)}`));
    console.log(`  + ${rel.source.slice(0, 30)} ${rel.type} ${rel.target.slice(0, 30)}`);
  }
}

async function createComments(titleToId) {
  if (!shouldRun("comments") || args.noComments) return;
  console.log("\n[stage] comments");
  for (const c of ISSUE_COMMENTS) {
    const id = titleToId.get(c.title);
    if (!id) continue;
    for (const body of c.bodies) {
      await gql(
        `mutation($input: CommentCreateInput!) { commentCreate(input: $input) { success } }`,
        { input: { issueId: id, body } }
      ).catch((e) => console.warn(`  ! ${c.title.slice(0, 40)}: ${shortErr(e)}`));
    }
    console.log(`  + ${c.bodies.length} comments on ${c.title.slice(0, 50)}`);
  }
}

function shortErr(e) {
  const m = (e?.message || String(e)).split("\n")[0];
  return m.length > 120 ? m.slice(0, 120) + "…" : m;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`linear-seed${args.dryRun ? " (DRY RUN)" : ""}`);
  const viewer = await getViewer();
  console.log(`viewer: ${viewer.name || viewer.id} @ ${viewer.organization?.urlKey || "?"}`);

  await ensureWorkspaceLabels();
  await ensureTeams();

  const teams = await listTeams();
  const teamMap = new Map(teams.map((t) => [t.key, t]));
  await ensureTeamLabels(teamMap);

  const projectMap = await ensureProjects(viewer.organization?.id, teamMap, viewer.id);
  await ensureInitiatives(projectMap);

  // Re-fetch teams to get fresh state node ids after team_labels stage
  const teams2 = await listTeams();
  const teamMap2 = new Map(teams2.map((t) => [t.key, t]));
  const titleToId = await createIssues(teamMap2, viewer.id);

  if (titleToId.size > 0) {
    await createRelations(titleToId);
    await createComments(titleToId);
  }

  console.log("\nDone. Next:");
  console.log("  pnpm capture:discover   # refresh .auth/discovery.json with the new teams/projects/issues");
  console.log("  pnpm capture --only workspace,issues   # capture your richer workspace");
}

main().catch((e) => {
  console.error("\nFatal:", e?.message || e);
  process.exit(1);
});
