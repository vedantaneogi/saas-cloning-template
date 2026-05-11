import { chromium } from "playwright";
import path from "node:path";
const OUT = path.resolve("research", "clone-shots");
const WEB = process.argv[2] || "https://3000-isafojzg02gmn4k5mtr16.e2b.app";
const b = await chromium.launch();
const p = await b.newPage();
await p.setViewportSize({ width: 1440, height: 900 });
p.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

const targets = [
  ["e2b.team-active", `${WEB}/demo/team/ENG/active`],
  ["e2b.roadmap", `${WEB}/demo/roadmap`],
  ["e2b.inbox", `${WEB}/demo/inbox`],
  ["e2b.customer-requests", `${WEB}/demo/customer-requests`],
];
for (const [name, url] of targets) {
  await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  console.log("→", name);
}
await b.close();
