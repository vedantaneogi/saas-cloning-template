// Connect to an existing E2B sandbox and dump web/api logs + status.
import { Sandbox } from "e2b";

const id = process.argv[2];
if (!id) {
  console.error("usage: node diagnose.mjs <sandbox-id>");
  process.exit(1);
}

const sb = await Sandbox.connect(id, { apiKey: process.env.E2B_API_KEY });
async function r(cmd) {
  const out = await sb.commands.run(cmd);
  return out.stdout.trim();
}

console.log("== ports listening ==");
console.log(await r("ss -tlnp 2>/dev/null || netstat -tln"));
console.log("\n== /tmp/api.log (tail) ==");
console.log(await r("tail -n 50 /tmp/api.log || true"));
console.log("\n== /tmp/web.log (tail) ==");
console.log(await r("tail -n 50 /tmp/web.log || true"));
console.log("\n== free ==");
console.log(await r("free -h"));
console.log("\n== running node procs ==");
console.log(await r("ps -ef | grep -E 'node|uvicorn' | grep -v grep || true"));
