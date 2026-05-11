import { chromium } from "playwright";
import path from "node:path";
const OUT = path.resolve("research", "clone-shots");

const b = await chromium.launch();
const p = await b.newPage();
await p.setViewportSize({ width: 1440, height: 900 });
p.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

// 1) Triage list page
await p.goto("http://localhost:3000/demo/team/ENG/triage", { waitUntil: "networkidle" });
await p.waitForTimeout(700);
await p.screenshot({ path: path.join(OUT, "clone.triage-list.png"), fullPage: true });
console.log("→ triage-list");

// 2) Confirm sidebar badge present and team list excludes triage entries
await p.goto("http://localhost:3000/demo/team/ENG/all", { waitUntil: "networkidle" });
await p.waitForTimeout(500);
await p.screenshot({ path: path.join(OUT, "clone.team-all-no-triage.png"), fullPage: true });
console.log("→ team-all-no-triage");

await b.close();
console.log("done");
