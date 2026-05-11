#!/usr/bin/env node
// Visual verification for cycles slice.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("research", "clone-shots");
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

// 1) Sidebar should show "Cycle 20 (active)" under Engineering when cycles_enabled
await page.goto("http://localhost:3000/demo/team/ENG/active", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(OUT, "clone.sidebar-active-cycle.png"), fullPage: false });
console.log("→ sidebar-active-cycle");

// 2) Cycles list page
await page.goto("http://localhost:3000/demo/team/ENG/cycles", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "clone.cycles-list.png"), fullPage: true });
console.log("→ cycles-list");

// 3) Cycle detail (click into the active cycle from sidebar)
await page.click("text=Cycle 20 (active)");
await page.waitForLoadState("networkidle");
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "clone.cycle-detail.png"), fullPage: true });
console.log("→ cycle-detail");

// 4) Cycle picker on issue rail
await page.goto("http://localhost:3000/demo/issue/ENG-1", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "clone.issue-with-cycle.png"), fullPage: false });
console.log("→ issue-with-cycle");

await browser.close();
console.log("done");
