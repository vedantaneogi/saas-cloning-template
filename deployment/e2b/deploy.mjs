#!/usr/bin/env node
// E2B deploy script. The default sandbox is tiny (~480 MB RAM), so we
// pre-build the Next.js app locally in standalone mode and upload only the
// runnable bundle. Python deps install in the sandbox via uv (small).
//
// Prerequisites (run locally before invoking):
//   1) cd apps/web && pnpm install (or npm install)
//   2) pnpm build  → produces .next/standalone + .next/static
//   3) PowerShell:
//        $stage = ".next/deploy-stage"; rm -r -fo $stage -ErrorAction SilentlyContinue; ni -t d $stage | out-null
//        cp -r .next/standalone/* $stage; ni -t d "$stage/.next" | out-null; cp -r .next/static "$stage/.next/static"
//        tar -czf ../../deployment/e2b/web-bundle.tar.gz -C $stage .
//
// Or just run `npm run deploy:e2b` once that script lands.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Sandbox } from "e2b";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.E2B_API_KEY;
if (!apiKey) {
  console.error("ERROR: E2B_API_KEY env var is required.");
  process.exit(1);
}

const REPO = process.env.REPO_URL || "https://github.com/vedantaneogi/saas-cloning-template.git";
const BRANCH = process.env.REPO_BRANCH || "linear-clone";
const TIMEOUT_MIN = Number(process.env.SANDBOX_TIMEOUT_MIN || 60);
const BUNDLE_PATH = path.join(__dirname, "web-bundle.tar.gz");

const log = (msg) => console.log(`[deploy] ${msg}`);

async function run(sandbox, cmd, opts = {}) {
  log(`$ ${cmd}`);
  const result = await sandbox.commands.run(cmd, { timeoutMs: 600_000, ...opts });
  if (result.exitCode !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`Command failed (exit ${result.exitCode}): ${cmd}`);
  }
  const head = result.stdout.trim().slice(0, 500);
  if (head) console.log(head);
  return result;
}

async function main() {
  if (!fs.existsSync(BUNDLE_PATH)) {
    console.error(`ERROR: ${BUNDLE_PATH} does not exist. Build the web bundle first (see top-of-file comment).`);
    process.exit(1);
  }
  const bundleSize = fs.statSync(BUNDLE_PATH).size;
  log(`Bundle: ${BUNDLE_PATH} (${(bundleSize / 1024 / 1024).toFixed(2)} MB)`);

  log(`Spawning sandbox (timeout ${TIMEOUT_MIN} min)…`);
  const sandbox = await Sandbox.create({ apiKey, timeoutMs: TIMEOUT_MIN * 60 * 1000 });
  log(`Sandbox id: ${sandbox.sandboxId}`);

  try {
    log("Installing prerequisites (git, uv) — Node already present in default template…");
    await run(sandbox, "sudo apt-get update -qq >/dev/null && sudo apt-get install -y -qq git ca-certificates >/dev/null");
    await run(sandbox, "curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null");

    log("Cloning repo (for API source) …");
    await run(sandbox, `git clone --depth 1 --branch ${BRANCH} ${REPO} /home/user/app`);

    log("Installing API deps (uv sync)…");
    await run(sandbox, "cd /home/user/app/apps/api && ~/.local/bin/uv sync --frozen --no-dev");

    log("Running Alembic migrations…");
    await run(sandbox, "cd /home/user/app/apps/api && ~/.local/bin/uv run alembic upgrade head");

    log("Uploading pre-built web bundle…");
    const bundleBytes = fs.readFileSync(BUNDLE_PATH);
    await sandbox.files.write("/home/user/web-bundle.tar.gz", bundleBytes);
    await run(sandbox, "mkdir -p /home/user/web && tar -xzf /home/user/web-bundle.tar.gz -C /home/user/web && ls /home/user/web | head -5");

    // Pre-compute public URLs (E2B routes each port to a unique HTTPS subdomain).
    const apiHost = sandbox.getHost(8000);
    const webHost = sandbox.getHost(3000);
    const apiUrl = `https://${apiHost}`;
    const webUrl = `https://${webHost}`;
    log(`API will be reachable at ${apiUrl}`);
    log(`Web will be reachable at ${webUrl}`);

    log("Starting API (uvicorn) in background…");
    await sandbox.commands.run(
      `cd /home/user/app/apps/api && SEED_PATH=/home/user/app/apps/api/seed.json CORS_ORIGINS='["*"]' nohup ~/.local/bin/uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/api.log 2>&1 &`,
      { background: true }
    );

    log("Starting web (Next standalone server.js) in background…");
    // Next rewrites in next.config.ts route /api/* to the upstream — they read
    // API_URL at runtime, so we can keep the same build across sandboxes.
    await sandbox.commands.run(
      `cd /home/user/web && API_URL=http://127.0.0.1:8000 PORT=3000 HOSTNAME=0.0.0.0 nohup node server.js > /tmp/web.log 2>&1 &`,
      { background: true }
    );

    log("Waiting for services to come up…");
    for (let i = 0; i < 40; i++) {
      const r = await sandbox.commands.run(`curl -s -o /dev/null -w "%{http_code}" ${apiUrl}/health || echo 000`);
      if (r.stdout.trim() === "200") {
        log("API healthy.");
        break;
      }
      await new Promise((res) => setTimeout(res, 1500));
    }
    for (let i = 0; i < 60; i++) {
      const r = await sandbox.commands.run(`curl -s -o /dev/null -w "%{http_code}" ${webUrl}/ || echo 000`);
      if (["200", "307", "308"].includes(r.stdout.trim())) {
        log("Web up.");
        break;
      }
      await new Promise((res) => setTimeout(res, 1500));
    }

    console.log("\n========================================");
    console.log(`  Sandbox ID:  ${sandbox.sandboxId}`);
    console.log(`  API URL:     ${apiUrl}`);
    console.log(`  Web URL:     ${webUrl}/demo`);
    console.log(`  Auto-expires in ${TIMEOUT_MIN} min`);
    console.log("========================================\n");
    console.log("Inspect logs from inside:  e2b sandbox connect " + sandbox.sandboxId);
    console.log("Then: tail -f /tmp/api.log /tmp/web.log");
  } catch (err) {
    console.error("[deploy] FAILED:", err.message);
    try {
      const api = await sandbox.commands.run("tail -n 30 /tmp/api.log || true");
      const web = await sandbox.commands.run("tail -n 30 /tmp/web.log || true");
      console.error("--- /tmp/api.log ---\n" + api.stdout);
      console.error("--- /tmp/web.log ---\n" + web.stdout);
    } catch {}
    throw err;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
