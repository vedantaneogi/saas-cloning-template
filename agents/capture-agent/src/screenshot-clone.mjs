#!/usr/bin/env node
// Quick screenshot helper — captures our clone's pages so we can compare
// them side-by-side with the Linear captures in research/screenshots/.

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("research", "clone-shots");
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const projectsRes = await fetch("http://127.0.0.1:8000/api/workspaces/demo/projects");
const projects = await projectsRes.json();
const q2 = projects.find((p) => p.name === "Q2 Platform Reliability") || projects[0];

const shots = [
  ["clone.team.active", "http://localhost:3000/demo/team/ENG/active"],
  ["clone.team.board", "http://localhost:3000/demo/team/ENG/active?display=board"],
  ["clone.team.grouped-priority", "http://localhost:3000/demo/team/ENG/active?group=priority"],
  ["clone.team.filtered-urgent", "http://localhost:3000/demo/team/ENG/active?priority=1"],
  ["clone.issue.full", "http://localhost:3000/demo/issue/ENG-1"],
  ["clone.inbox", "http://localhost:3000/demo/inbox"],
  ["clone.my-issues", "http://localhost:3000/demo/my/assigned"],
  ["clone.projects", "http://localhost:3000/demo/projects"],
  ["clone.project.detail", `http://localhost:3000/demo/project/${q2.slug_id}`],
];

for (const [id, url] of shots) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${id}.png`), fullPage: true });
  console.log("→", id);
}

// Modal open
await page.goto("http://localhost:3000/demo/team/ENG/active", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.keyboard.press("c");
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "clone.create-modal.png") });
console.log("→ clone.create-modal");

// Cheatsheet
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await page.keyboard.press("?");
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, "clone.cheatsheet.png") });
console.log("→ clone.cheatsheet");

// Sidebar collapsed test
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
await page.click("text=Workspace");
await page.waitForTimeout(200);
await page.click("text=Your teams");
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT, "clone.sidebar-collapsed.png") });
console.log("→ clone.sidebar-collapsed");

await browser.close();
