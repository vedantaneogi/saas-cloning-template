import { chromium } from "playwright";
import path from "node:path";
const OUT = path.resolve("research", "clone-shots");
const b = await chromium.launch();
const p = await b.newPage();
await p.setViewportSize({ width: 1440, height: 900 });
p.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

await p.goto("http://localhost:3000/demo/team/ENG/active", { waitUntil: "networkidle" });
await p.waitForTimeout(500);
await p.screenshot({ path: path.join(OUT, "clone.sidebar-with-unread.png"), fullPage: false });
console.log("→ sidebar-with-unread");

await p.goto("http://localhost:3000/demo/inbox", { waitUntil: "networkidle" });
await p.waitForTimeout(500);
await p.screenshot({ path: path.join(OUT, "clone.inbox-with-notifications.png"), fullPage: true });
console.log("→ inbox-with-notifications");

await b.close();
console.log("done");
