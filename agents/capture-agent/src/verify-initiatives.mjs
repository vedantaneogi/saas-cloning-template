import { chromium } from "playwright";
import path from "node:path";
const OUT = path.resolve("research", "clone-shots");

const b = await chromium.launch();
const p = await b.newPage();
await p.setViewportSize({ width: 1440, height: 900 });
p.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

// 1) Initiatives list page
await p.goto("http://localhost:3000/demo/initiatives", { waitUntil: "networkidle" });
await p.waitForTimeout(700);
await p.screenshot({ path: path.join(OUT, "clone.initiatives-list.png"), fullPage: true });
console.log("→ initiatives-list");

// 2) Click into Platform foundations
await p.click("text=Platform foundations");
await p.waitForLoadState("networkidle");
await p.waitForTimeout(500);
await p.screenshot({ path: path.join(OUT, "clone.initiative-detail.png"), fullPage: true });
console.log("→ initiative-detail");

// 3) Project page with initiative chip
await p.goto("http://localhost:3000/demo/project/" + (await (await fetch("http://127.0.0.1:8000/api/workspaces/demo/projects")).json()).find((x) => x.name === "Q2 Platform Reliability").slug_id, { waitUntil: "networkidle" });
await p.waitForTimeout(500);
await p.screenshot({ path: path.join(OUT, "clone.project-with-initiative.png"), fullPage: false });
console.log("→ project-with-initiative");

// 4) Cmd-K finds initiatives
await p.goto("http://localhost:3000/demo/projects", { waitUntil: "networkidle" });
await p.waitForTimeout(300);
await p.keyboard.press("Meta+k");
await p.waitForTimeout(300);
await p.keyboard.type("foundations", { delay: 30 });
await p.waitForTimeout(500);
await p.screenshot({ path: path.join(OUT, "clone.palette-initiative.png") });
console.log("→ palette-initiative");

await b.close();
console.log("done");
