#!/usr/bin/env node
// Probe E2B sandbox resources before committing to a real deploy.

import { Sandbox } from "e2b";

const apiKey = process.env.E2B_API_KEY;
if (!apiKey) {
  console.error("ERROR: E2B_API_KEY env var is required.");
  process.exit(1);
}

const sb = await Sandbox.create({ apiKey, timeoutMs: 10 * 60 * 1000 });
console.log("sandbox:", sb.sandboxId);

async function r(cmd) {
  const out = await sb.commands.run(cmd, { timeoutMs: 60_000 });
  return out.stdout.trim();
}

console.log("--- whoami / pwd ---");
console.log(await r("whoami; pwd"));

console.log("--- mem ---");
console.log(await r("free -h"));

console.log("--- cpu ---");
console.log(await r("nproc; cat /proc/cpuinfo | grep 'model name' | head -1"));

console.log("--- disk ---");
console.log(await r("df -h /"));

console.log("--- node/npm versions ---");
console.log(await r("which node || true; node --version 2>&1 || true; which npm || true; npm --version 2>&1 || true"));

console.log("--- /etc/os-release ---");
console.log(await r("cat /etc/os-release | head -5"));

console.log("Done — keeping sandbox alive 60s so you can poke via SDK if needed.");
await sb.kill();
