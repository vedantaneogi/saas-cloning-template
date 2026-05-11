import { chromium } from "playwright";
import path from "node:path";
const OUT = path.resolve("research", "clone-shots");
const b = await chromium.launch();
const p = await b.newPage();
await p.setViewportSize({ width: 1440, height: 900 });
p.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

await p.goto("http://localhost:3000/demo/customer-requests", { waitUntil: "networkidle" });
await p.waitForTimeout(700);
await p.screenshot({ path: path.join(OUT, "clone.customer-requests.png"), fullPage: true });
console.log("→ customer-requests");

await p.goto("http://localhost:3000/demo/issue/ENG-1", { waitUntil: "networkidle" });
await p.waitForTimeout(700);
await p.screenshot({ path: path.join(OUT, "clone.issue-with-cr.png"), fullPage: true });
console.log("→ issue-with-cr");

await b.close();
