import { chromium } from "playwright";
import path from "node:path";
const OUT = path.resolve("research", "clone-shots");
const b = await chromium.launch();
const p = await b.newPage();
await p.setViewportSize({ width: 1440, height: 900 });
p.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
p.on("console", (m) => { if (m.type() === "error") console.error("CONSOLE ERROR:", m.text()); });

await p.goto("http://localhost:3000/demo/initiative/platform-foundations-63823f0e0dc5", { waitUntil: "networkidle" });
await p.waitForTimeout(800);
await p.screenshot({ path: path.join(OUT, "clone.initiative-detail.png"), fullPage: true });
console.log("→ initiative-detail (direct)");

await b.close();
