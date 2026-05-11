import { chromium } from "playwright";
import path from "node:path";
const OUT = path.resolve("research", "clone-shots");
const b = await chromium.launch();
const p = await b.newPage();
await p.setViewportSize({ width: 1600, height: 900 });
p.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

await p.goto("http://localhost:3000/demo/roadmap", { waitUntil: "networkidle" });
await p.waitForTimeout(700);
await p.screenshot({ path: path.join(OUT, "clone.roadmap.png"), fullPage: true });
console.log("→ roadmap");

await b.close();
