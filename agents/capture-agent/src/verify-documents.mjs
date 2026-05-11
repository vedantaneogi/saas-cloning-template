import { chromium } from "playwright";
import path from "node:path";
const OUT = path.resolve("research", "clone-shots");
const b = await chromium.launch();
const p = await b.newPage();
await p.setViewportSize({ width: 1440, height: 900 });
p.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

// 1) Workspace documents list
await p.goto("http://localhost:3000/demo/documents", { waitUntil: "networkidle" });
await p.waitForTimeout(700);
await p.screenshot({ path: path.join(OUT, "clone.documents-list.png"), fullPage: true });
console.log("→ documents-list");

// 2) Document detail
const docs = await (await fetch("http://127.0.0.1:8000/api/workspaces/demo/documents")).json();
const target = docs.find((d) => d.title === "Q2 reliability spec") || docs[0];
await p.goto("http://localhost:3000/demo/document/" + target.slug_id, { waitUntil: "networkidle" });
await p.waitForTimeout(700);
await p.screenshot({ path: path.join(OUT, "clone.document-detail.png"), fullPage: true });
console.log("→ document-detail");

// 3) Project page with docs section
const projects = await (await fetch("http://127.0.0.1:8000/api/workspaces/demo/projects")).json();
const q2 = projects.find((x) => x.name === "Q2 Platform Reliability");
await p.goto("http://localhost:3000/demo/project/" + q2.slug_id, { waitUntil: "networkidle" });
await p.waitForTimeout(700);
await p.screenshot({ path: path.join(OUT, "clone.project-with-docs.png"), fullPage: true });
console.log("→ project-with-docs");

// 4) Palette finds documents
await p.goto("http://localhost:3000/demo/projects", { waitUntil: "networkidle" });
await p.waitForTimeout(300);
await p.keyboard.press("Meta+k");
await p.waitForTimeout(300);
await p.keyboard.type("reliability", { delay: 30 });
await p.waitForTimeout(500);
await p.screenshot({ path: path.join(OUT, "clone.palette-document.png") });
console.log("→ palette-document");

await b.close();
console.log("done");
