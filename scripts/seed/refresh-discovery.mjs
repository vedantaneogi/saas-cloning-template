#!/usr/bin/env node
// Refresh .auth/discovery.json from the Linear API so placeholders point at
// the seeded entities (ENG team, Q2 project, ENG-1 issue, etc.) rather than
// whatever the sidebar-sniff in capture-agent picked.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..", "..");
const DISCOVERY_PATH = path.join(REPO_ROOT, ".auth", "discovery.json");

// Load .env
for (const line of fs.readFileSync(path.join(REPO_ROOT, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
  if (m && !line.trim().startsWith("#") && !process.env[m[1]]) {
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}
const TOKEN = process.env.LINEAR_API_KEY;
if (!TOKEN) {
  console.error("LINEAR_API_KEY missing in .env");
  process.exit(1);
}

async function gql(query) {
  const r = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { Authorization: TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await r.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const data = await gql(`{
  viewer { organization { urlKey } }
  teams(first: 20) { nodes { id key name } }
  projects(first: 50) { nodes { id name slugId state } }
  initiatives(first: 20) { nodes { id name slugId } }
  documents(first: 20) { nodes { id title slugId } }
  rich: issue(id: "ENG-1") { identifier url }
  simple: issue(id: "ENG-46") { identifier url }
}`);

// Linear redirects /issue/<id> → /issue/<id>/<slug>; if Playwright lands on
// the intermediate it sometimes captures the 404 state. Use the full
// "<id>/<slug>" form in the {issue} placeholder so URLs are direct.
function urlToPlaceholder(u) {
  if (!u) return "";
  const m = u.match(/\/issue\/(.+)$/);
  return m ? m[1] : "";
}

const teams = data.teams.nodes;
const projects = data.projects.nodes;
const initiatives = data.initiatives?.nodes || [];
const documents = data.documents?.nodes || [];

const eng = teams.find((t) => t.key === "ENG") || teams[0];
const tes = teams.find((t) => t.key === "TES") || teams[teams.length - 1];

const inProgress = projects.find((p) => p.state === "started");
const completed = projects.find((p) => p.state === "completed");
const any = projects[0];

// Use the slugged form so Linear doesn't show a transient 404 during redirect.
const richIssue = urlToPlaceholder(data.rich?.url) || `${eng.key}-1`;
const simpleIssue = urlToPlaceholder(data.simple?.url) || `${eng.key}-46`;

const discovery = {
  workspace: data.viewer.organization.urlKey,
  team: eng.key,
  team2: tes?.key || eng.key,
  project: inProgress ? `${slugify(inProgress.name)}-${inProgress.slugId}` : any ? `${slugify(any.name)}-${any.slugId}` : "",
  project_in_progress: inProgress ? `${slugify(inProgress.name)}-${inProgress.slugId}` : "",
  project_completed: completed ? `${slugify(completed.name)}-${completed.slugId}` : "",
  initiative: initiatives[0] ? `${slugify(initiatives[0].name)}-${initiatives[0].slugId}` : "",
  cycle_current: "active",
  cycle_past: "",
  issue: richIssue,
  issue_simple: simpleIssue,
  document: documents[0] ? `${slugify(documents[0].title)}-${documents[0].slugId}` : "",
  _resolved_at: new Date().toISOString(),
  _source: "scripts/seed/refresh-discovery.mjs",
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

fs.mkdirSync(path.dirname(DISCOVERY_PATH), { recursive: true });
fs.writeFileSync(DISCOVERY_PATH, JSON.stringify(discovery, null, 2));
console.log("Wrote", DISCOVERY_PATH);
console.log(JSON.stringify(discovery, null, 2));
