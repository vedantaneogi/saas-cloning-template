#!/usr/bin/env node
// One-off visual verification of saved views / favorites / cmd-palette / bulk-select.

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("research", "clone-shots");
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

// 1) Filtered list shows Save button
await page.goto("http://localhost:3000/demo/team/ENG/active?priority=1", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(OUT, "clone.filtered-with-save.png"), fullPage: true });
console.log("→ filtered-with-save");

// 2) Open Save view popover
await page.click("button[aria-label='Save view']");
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, "clone.save-view-popover.png") });
console.log("→ save-view-popover");
await page.keyboard.press("Escape");

// 3) Saved view in sidebar (should be visible already because we created one via curl)
await page.goto("http://localhost:3000/demo/team/ENG/active", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "clone.sidebar-with-saved-view.png"), fullPage: true });
console.log("→ sidebar-with-saved-view");

// 4) Command palette (Cmd+K)
await page.keyboard.press("Meta+k");
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, "clone.cmd-palette-empty.png") });
console.log("→ cmd-palette-empty");

await page.keyboard.type("ENG", { delay: 30 });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, "clone.cmd-palette-search.png") });
console.log("→ cmd-palette-search");
await page.keyboard.press("Escape");

// 5) Bulk multi-select
await page.goto("http://localhost:3000/demo/team/ENG/active", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
// Hover the first row and click its checkbox
const rows = page.locator("a[href*='/demo/issue/']");
await rows.first().hover();
await page.waitForTimeout(150);
// Force-click the checkbox button (first per-row select button)
const cb = page.locator("button[aria-label='Select']").first();
await cb.click({ force: true });
await page.waitForTimeout(200);
// Shift-click row 3 to select range
await rows.nth(2).hover();
await page.waitForTimeout(150);
const cb3 = page.locator("button[aria-label='Select']").nth(2);
await cb3.click({ modifiers: ["Shift"], force: true });
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, "clone.bulk-selection.png"), fullPage: false });
console.log("→ bulk-selection");

await browser.close();
console.log("done");
