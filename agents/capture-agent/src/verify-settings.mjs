import { chromium } from "playwright";
import path from "node:path";
const OUT = path.resolve("research", "clone-shots");
const b = await chromium.launch();
const p = await b.newPage();
await p.setViewportSize({ width: 1440, height: 900 });
p.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

await p.goto("http://localhost:3000/demo/settings/members", { waitUntil: "networkidle" });
await p.waitForTimeout(500);
await p.screenshot({ path: path.join(OUT, "clone.settings-members.png"), fullPage: true });
console.log("→ settings-members");

await p.goto("http://localhost:3000/demo/settings/labels", { waitUntil: "networkidle" });
await p.waitForTimeout(500);
await p.screenshot({ path: path.join(OUT, "clone.settings-labels.png"), fullPage: true });
console.log("→ settings-labels");

await p.goto("http://localhost:3000/demo/settings/team/ENG", { waitUntil: "networkidle" });
await p.waitForTimeout(500);
await p.screenshot({ path: path.join(OUT, "clone.settings-team.png"), fullPage: true });
console.log("→ settings-team");

await b.close();
