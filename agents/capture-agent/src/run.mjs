#!/usr/bin/env node
// capture-agent — Playwright-driven Linear screenshot harvester.
//
// Run modes:
//   node src/run.mjs --login                 first-run interactive login (headed)
//   node src/run.mjs --discover              re-run placeholder discovery
//   node src/run.mjs                         walk the full capture plan headless
//   node src/run.mjs --only auth             single area
//   node src/run.mjs --only issues,workspace several areas
//   node src/run.mjs --only issues.team.active   single entry
//   node src/run.mjs --themes dark           override themes (default: from plan)
//   node src/run.mjs --headed                show the browser while walking
//   node src/run.mjs --no-video              skip per-entry video recording
//
// Outputs land in research/screenshots/<area>/<id>.<theme>.{png,html,a11y.json,
// styles.json,tokens.json,animations.json,video.webm}. Progress streams to
// research/capture-log.jsonl, one JSON object per entry+theme.

import { chromium, devices } from "playwright";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const AUTH_DIR = path.join(REPO_ROOT, ".auth");
const STORAGE_STATE_PATH = path.join(AUTH_DIR, "linear.json");
const DISCOVERY_PATH = path.join(AUTH_DIR, "discovery.json");
const CHROME_PROFILE_DIR = path.join(AUTH_DIR, "chrome-profile");
const PLAN_PATH = path.join(REPO_ROOT, "research", "capture-plan.yaml");
const SCREENSHOTS_ROOT = path.join(REPO_ROOT, "research", "screenshots");
const LOG_PATH = path.join(REPO_ROOT, "research", "capture-log.jsonl");
const VIDEO_TMP = path.join(REPO_ROOT, "research", ".video-tmp");

const IS_MAC = process.platform === "darwin";
const MOD_KEY = IS_MAC ? "Meta" : "Control";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    only: [],
    themes: null,
    login: false,
    discover: false,
    headed: false,
    noVideo: false,
    maxEntries: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--login") args.login = true;
    else if (a === "--discover") args.discover = true;
    else if (a === "--headed") args.headed = true;
    else if (a === "--no-video") args.noVideo = true;
    else if (a === "--only") args.only = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--themes") args.themes = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--max") args.maxEntries = Number(argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.log(HELP);
      process.exit(0);
    } else {
      console.warn(`unknown arg: ${a}`);
    }
  }
  return args;
}

const HELP = `capture-agent — usage:

  --login            Headed login flow; saves storage state to .auth/linear.json
  --discover         Re-resolve placeholders (workspace slug, team prefixes, etc.)
  --only <list>      Comma-separated areas or entry ids (e.g. issues, issues.team.active)
  --themes <list>    Override themes (light,dark)
  --headed           Run the capture pass with a visible browser
  --no-video         Skip per-entry video recording (much faster)
  --max <n>          Stop after N entries (debugging)
`;

// ---------------------------------------------------------------------------
// IO helpers
// ---------------------------------------------------------------------------

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function loadPlan() {
  const raw = await fs.readFile(PLAN_PATH, "utf8");
  const plan = yaml.load(raw);
  if (!plan || !Array.isArray(plan.areas)) {
    throw new Error("capture-plan.yaml: expected top-level `areas: []`");
  }
  return plan;
}

async function loadDiscovery() {
  try {
    return JSON.parse(await fs.readFile(DISCOVERY_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function saveDiscovery(d) {
  await ensureDir(AUTH_DIR);
  await fs.writeFile(DISCOVERY_PATH, JSON.stringify(d, null, 2));
}

async function appendLog(record) {
  await fs.appendFile(LOG_PATH, JSON.stringify(record) + "\n");
}

// ---------------------------------------------------------------------------
// Plan flattening + filtering
// ---------------------------------------------------------------------------

function flattenEntries(plan) {
  const out = [];
  for (const area of plan.areas) {
    for (const cap of area.captures || []) {
      out.push({ ...cap, area: area.name });
    }
  }
  // global_states.error.captures
  const errs = plan.global_states?.error?.captures || [];
  for (const cap of errs) out.push({ ...cap, area: "error" });
  return out;
}

function filterEntries(entries, args) {
  if (!args.only.length) return args.maxEntries ? entries.slice(0, args.maxEntries) : entries;
  const tokens = new Set(args.only);
  const filtered = entries.filter((e) => tokens.has(e.id) || tokens.has(e.area));
  return args.maxEntries ? filtered.slice(0, args.maxEntries) : filtered;
}

function pickThemes(entry, plan, args) {
  if (args.themes) return args.themes;
  const t = entry.theme || plan.defaults?.theme || "dark";
  if (t === "both") return ["light", "dark"];
  return [t];
}

function pickViewport(entry, plan) {
  const key = entry.viewport || plan.defaults?.viewport || "desktop_wide";
  if (typeof key === "object") return key; // raw {width,height}
  return plan.viewport_presets?.[key] || { width: 1440, height: 900 };
}

// ---------------------------------------------------------------------------
// Placeholder substitution
// ---------------------------------------------------------------------------

function substitute(str, discovery) {
  if (!str || !discovery) return str;
  return str.replace(/\{([a-zA-Z0-9_]+)\}/g, (m, k) => {
    if (discovery[k]) return discovery[k];
    return m;
  });
}

function resolveUrl(entry, plan, discovery) {
  const url = entry.url;
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return substitute(url, discovery);
  const base = substitute(plan.config?.workspace_url || "https://linear.app/{workspace}", discovery);
  return base.replace(/\/$/, "") + (url.startsWith("/") ? url : "/" + url);
}

// ---------------------------------------------------------------------------
// Nav step interpreter
// ---------------------------------------------------------------------------

async function executeStep(page, step, discovery) {
  if (step.goto) {
    await page.goto(substitute(step.goto, discovery), { waitUntil: "domcontentloaded" });
  } else if (step.click) {
    const sel = substitute(step.click, discovery);
    await page.locator(sel).first().click({ button: step.modifier === "right" ? "right" : "left", timeout: 5000 });
  } else if (step.click_text) {
    await page.getByText(substitute(step.click_text, discovery), { exact: false }).first().click({ timeout: 5000 });
  } else if (step.type) {
    const sel = substitute(step.type, discovery);
    await page.locator(sel).first().fill(substitute(step.text || "", discovery), { timeout: 5000 });
  } else if (step.press) {
    const key = substitute(step.press, discovery).replace(/Mod/g, MOD_KEY);
    await page.keyboard.press(key);
  } else if (step.hover) {
    const sel = substitute(step.hover, discovery);
    await page.locator(sel).first().hover({ timeout: 5000 });
  } else if (step.wait_for) {
    await page.locator(substitute(step.wait_for, discovery)).first().waitFor({ timeout: 10000 });
  } else if (step.wait_ms) {
    await page.waitForTimeout(step.wait_ms);
  } else {
    throw new Error("unknown nav step: " + JSON.stringify(step));
  }
}

// ---------------------------------------------------------------------------
// Theme handling
// ---------------------------------------------------------------------------

async function applyTheme(context, page, theme) {
  await context.addInitScript((t) => {
    try {
      // Best-effort: Linear stores theme prefs in localStorage under varied
      // keys across releases. Set the common ones; the app reads on boot.
      localStorage.setItem("theme", t);
      localStorage.setItem("colorScheme", t);
      localStorage.setItem("ui:theme", t);
    } catch {}
  }, theme);
  if (page) await page.emulateMedia({ colorScheme: theme });
}

// ---------------------------------------------------------------------------
// In-page extractors
// ---------------------------------------------------------------------------

function EXTRACT_STYLES(selectors) {
  const out = {};
  for (const sel of selectors) {
    const nodes = Array.from(document.querySelectorAll(sel)).slice(0, 5);
    out[sel] = nodes.map((n) => {
      const cs = getComputedStyle(n);
      const props = {};
      const keep = [
        "color", "backgroundColor", "backgroundImage", "borderRadius",
        "borderColor", "borderWidth", "borderStyle", "boxShadow",
        "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
        "padding", "margin", "gap", "display", "flexDirection", "alignItems",
        "justifyContent", "gridTemplateColumns", "gridTemplateRows",
        "opacity", "transform", "transition", "transitionDuration",
        "animationName", "animationDuration", "width", "height",
        "outlineColor", "outlineWidth", "textTransform", "cursor",
      ];
      for (const k of keep) props[k] = cs[k];
      const rect = n.getBoundingClientRect();
      return {
        tag: n.tagName.toLowerCase(),
        classes:
          n.className && typeof n.className === "string"
            ? n.className.split(/\s+/).filter(Boolean)
            : [],
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        styles: props,
      };
    });
  }
  return out;
}

function EXTRACT_TOKENS() {
  const harvest = (el) => {
    const out = {};
    const cs = getComputedStyle(el);
    for (let i = 0; i < cs.length; i++) {
      const name = cs[i];
      if (name.startsWith("--")) out[name] = cs.getPropertyValue(name).trim();
    }
    return out;
  };
  return {
    root: harvest(document.documentElement),
    body: harvest(document.body),
  };
}

function EXTRACT_ANIMATIONS() {
  const seen = new Map();
  const all = Array.from(document.querySelectorAll("*")).slice(0, 2000);
  for (const el of all) {
    const cs = getComputedStyle(el);
    const tr = cs.transition;
    const an = cs.animationName;
    if ((tr && tr !== "all 0s ease 0s" && tr !== "none") || (an && an !== "none")) {
      const key =
        el.tagName.toLowerCase() +
        "." +
        (el.className && typeof el.className === "string"
          ? el.className.split(/\s+/).slice(0, 2).join(".")
          : "");
      if (!seen.has(key)) {
        seen.set(key, {
          tag: el.tagName.toLowerCase(),
          classes: typeof el.className === "string" ? el.className : "",
          transition: tr,
          transitionDuration: cs.transitionDuration,
          transitionTimingFunction: cs.transitionTimingFunction,
          animationName: an,
          animationDuration: cs.animationDuration,
          animationTimingFunction: cs.animationTimingFunction,
        });
      }
    }
  }
  return Array.from(seen.values());
}

// ---------------------------------------------------------------------------
// Capture one entry × one theme
// ---------------------------------------------------------------------------

async function captureEntry({ browser, entry, theme, plan, discovery, args, baseStorageState }) {
  const t0 = Date.now();
  const areaDir = path.join(SCREENSHOTS_ROOT, entry.area);
  await ensureDir(areaDir);
  const stem = path.join(areaDir, `${entry.id}.${theme}`);

  const viewport = pickViewport(entry, plan);
  const captureVideo = !args.noVideo && plan.defaults?.capture_video !== false;
  const requiresAuth = entry.requires_auth !== false;
  const videoDir = path.join(VIDEO_TMP, `${entry.id}.${theme}`);
  if (captureVideo) await ensureDir(videoDir);

  const context = await browser.newContext({
    viewport,
    storageState: requiresAuth ? baseStorageState : undefined,
    recordVideo: captureVideo ? { dir: videoDir, size: plan.defaults?.video_size || viewport } : undefined,
  });

  const page = await context.newPage();
  await applyTheme(context, page, theme);
  let status = "ok";
  let error = null;
  try {
    const url = resolveUrl(entry, plan, discovery);
    if (url) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page
        .waitForLoadState("networkidle", { timeout: plan.defaults?.network_idle_timeout_ms || 12000 })
        .catch(() => {});
    }
    for (const step of entry.nav || []) {
      await executeStep(page, step, discovery);
    }
    await page.waitForTimeout(entry.extra_wait_ms || plan.defaults?.extra_wait_ms || 600);

    // Artifacts — each wrapped so one failure doesn't drop the others.
    const failures = [];
    const tryArtifact = async (name, fn) => {
      try { await fn(); } catch (e) { failures.push(`${name}: ${e?.message || e}`); }
    };

    await tryArtifact("png", () =>
      page.screenshot({ path: stem + ".png", fullPage: entry.full_page ?? plan.defaults?.full_page ?? true })
    );
    await tryArtifact("html", async () => fs.writeFile(stem + ".html", await page.content()));

    await tryArtifact("a11y", async () => {
      // Playwright 1.50+: ariaSnapshot returns a YAML-style structured tree.
      const snap = await page.locator("body").ariaSnapshot({ timeout: 5000 });
      if (snap) await fs.writeFile(stem + ".a11y.yaml", snap);
    });

    const selectors = entry.selectors_of_interest || plan.defaults?.selectors_of_interest || [];
    if (selectors.length) {
      await tryArtifact("styles", async () => {
        const styles = await page.evaluate(EXTRACT_STYLES, selectors);
        await fs.writeFile(stem + ".styles.json", JSON.stringify(styles, null, 2));
      });
    }

    await tryArtifact("tokens", async () => {
      const tokens = await page.evaluate(EXTRACT_TOKENS);
      await fs.writeFile(stem + ".tokens.json", JSON.stringify(tokens, null, 2));
    });

    await tryArtifact("animations", async () => {
      const anims = await page.evaluate(EXTRACT_ANIMATIONS);
      await fs.writeFile(stem + ".animations.json", JSON.stringify(anims, null, 2));
    });

    if (failures.length) {
      status = "partial";
      error = failures.join("; ");
    }

    // Interactive state matrix for button-states entries
    if (entry.capture_states && entry.target_selector) {
      for (const state of entry.capture_states) {
        try {
          const loc = page.locator(substitute(entry.target_selector, discovery)).first();
          if (state === "idle") {
            await page.mouse.move(0, 0);
          } else if (state === "hover") {
            await loc.hover();
          } else if (state === "focus") {
            await loc.focus();
          } else if (state === "active") {
            const box = await loc.boundingBox();
            if (box) {
              await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
              await page.mouse.down();
            }
          } else if (state === "disabled") {
            // skip programmatic disabling; rely on naturally disabled instances
          }
          await page.waitForTimeout(120);
          const buf = await loc.screenshot().catch(() => null);
          if (buf) await fs.writeFile(`${stem}.state-${state}.png`, buf);
          if (state === "active") await page.mouse.up();
        } catch (e) {
          // continue across states
        }
      }
    }
  } catch (e) {
    status = "error";
    error = String(e?.message || e);
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    if (captureVideo) {
      try {
        const files = (await fs.readdir(videoDir)).filter((f) => f.endsWith(".webm"));
        if (files[0]) {
          await fs.rename(path.join(videoDir, files[0]), stem + ".video.webm");
        }
        await fs.rm(videoDir, { recursive: true, force: true });
      } catch {}
    }
  }

  const record = {
    ts: new Date().toISOString(),
    id: entry.id,
    area: entry.area,
    theme,
    status,
    duration_ms: Date.now() - t0,
    error,
  };
  await appendLog(record);
  const tag = status === "ok" ? "OK " : status === "partial" ? "WARN" : "ERR ";
  console.log(`[${tag}] ${entry.id}.${theme} (${record.duration_ms}ms)${error ? "  — " + error.split("\n")[0] : ""}`);
  return record;
}

// ---------------------------------------------------------------------------
// Login (interactive, headed)
// ---------------------------------------------------------------------------

const STEALTH_INIT = `() => {
  // Mask common automation tells. Linear's anti-bot rejects the default
  // Playwright fingerprint, so we soften the giveaways.
  try { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); } catch {}
  try {
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
  } catch {}
  try {
    const orig = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function () { return orig.apply(this, arguments); };
  } catch {}
}`;

async function launchPersistentForLogin() {
  await ensureDir(CHROME_PROFILE_DIR);
  const launchArgs = [
    "--disable-blink-features=AutomationControlled",
    "--no-default-browser-check",
    "--no-first-run",
  ];
  // Prefer real Chrome (better fingerprint) if installed; fall back to Chromium.
  for (const channel of ["chrome", "msedge", undefined]) {
    try {
      const ctx = await chromium.launchPersistentContext(CHROME_PROFILE_DIR, {
        headless: false,
        channel,
        args: launchArgs,
        viewport: { width: 1280, height: 900 },
      });
      if (channel) console.log(`Using browser channel: ${channel}`);
      await ctx.addInitScript(STEALTH_INIT);
      return ctx;
    } catch (e) {
      // try next
    }
  }
  throw new Error("Failed to launch any browser channel for login");
}

async function runLogin() {
  await ensureDir(AUTH_DIR);
  console.log("Opening browser for Linear login. Complete login in the window…");
  console.log("Tip: leave the browser open until you see 'Saved storage state' below.");
  const context = await launchPersistentForLogin();
  const page = (context.pages()[0]) || await context.newPage();

  let saved = false;
  const EXCLUDE = new Set(["", "login", "signup", "signin", "oauth", "magic", "auth", "logout"]);

  const isPostLogin = (raw) => {
    try {
      const u = new URL(raw);
      if (!/linear\.app$/.test(u.hostname)) return false;
      const first = u.pathname.split("/").filter(Boolean)[0] || "";
      return !EXCLUDE.has(first);
    } catch {
      return false;
    }
  };

  const saveIfPostLogin = async () => {
    if (saved) return;
    if (!isPostLogin(page.url())) return;
    try {
      await context.storageState({ path: STORAGE_STATE_PATH });
      saved = true;
      console.log("Detected post-login URL:", page.url());
      console.log("Saved storage state →", STORAGE_STATE_PATH);
      console.log("You can close the browser now. Then run: pnpm capture");
    } catch (e) {
      // context may be tearing down — that's fine
    }
  };

  page.on("framenavigated", () => {
    saveIfPostLogin().catch(() => {});
  });
  page.on("close", () => {});

  await page.goto("https://linear.app/login").catch(() => {});

  // Watch for up to 10 minutes or until the user closes the browser.
  const start = Date.now();
  while (Date.now() - start < 10 * 60 * 1000) {
    try {
      await page.waitForTimeout(1000);
      await saveIfPostLogin();
      if (saved) {
        // Persist a second time once cookies/localStorage have likely settled.
        await page.waitForTimeout(2000).catch(() => {});
        try {
          await context.storageState({ path: STORAGE_STATE_PATH });
        } catch {}
        break;
      }
    } catch {
      // page/context closed — exit the loop
      break;
    }
  }

  await context.close().catch(() => {});

  if (!saved) {
    console.error("Login did not complete — no post-login URL was reached before the browser closed.");
    console.error("Run `pnpm capture:login` again and finish the login (don't close the window early).");
    process.exit(1);
  } else {
    console.log("Now run: pnpm capture (will run discovery automatically on first pass)");
  }
}

// ---------------------------------------------------------------------------
// Discovery — fill placeholders from a live, authenticated workspace.
// ---------------------------------------------------------------------------

async function runDiscovery(plan, args) {
  console.log("Running discovery against your workspace…");
  const browser = await chromium.launch({ headless: !args.headed });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto("https://linear.app/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

  // 1. workspace slug — Linear redirects /<root> to /<workspace>/inbox or similar.
  let workspace = "";
  const u = new URL(page.url());
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length >= 1) workspace = parts[0];

  // 2. team identifiers — sniff sidebar links to /<workspace>/team/<ID>/...
  const teams = await page.evaluate((ws) => {
    const links = Array.from(document.querySelectorAll(`a[href*="/${ws}/team/"]`));
    const ids = new Set();
    for (const a of links) {
      const m = a.getAttribute("href").match(new RegExp(`/${ws}/team/([^/]+)`));
      if (m) ids.add(m[1]);
    }
    return Array.from(ids);
  }, workspace);

  // 3. a representative issue from the first team's active view
  let issue = "";
  let issueSimple = "";
  if (teams[0]) {
    await page.goto(`https://linear.app/${workspace}/team/${teams[0]}/active`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    const ids = await page.evaluate((ws) => {
      const links = Array.from(document.querySelectorAll(`a[href*="/${ws}/issue/"]`));
      const seen = [];
      for (const a of links) {
        const m = a.getAttribute("href").match(new RegExp(`/${ws}/issue/([^/?#]+)`));
        if (m && !seen.includes(m[1])) seen.push(m[1]);
        if (seen.length >= 5) break;
      }
      return seen;
    }, workspace);
    issue = ids[0] || "";
    issueSimple = ids[1] || ids[0] || "";
  }

  // 4. a project
  let project = "";
  await page.goto(`https://linear.app/${workspace}/projects`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  project = await page
    .evaluate((ws) => {
      const a = document.querySelector(`a[href*="/${ws}/project/"]`);
      if (!a) return "";
      const m = a.getAttribute("href").match(new RegExp(`/${ws}/project/([^/?#]+)`));
      return m ? m[1] : "";
    }, workspace)
    .catch(() => "");

  await browser.close();

  const discovery = {
    workspace,
    team: teams[0] || "",
    team2: teams[1] || teams[0] || "",
    project,
    project_in_progress: project,
    project_completed: "",
    initiative: "",
    cycle_current: "active",
    cycle_past: "",
    issue,
    issue_simple: issueSimple,
    document: "",
    _resolved_at: new Date().toISOString(),
  };
  await saveDiscovery(discovery);
  console.log("Discovery →", DISCOVERY_PATH);
  console.log(JSON.stringify(discovery, null, 2));
  console.log("\nEdit .auth/discovery.json by hand to fill any blank fields before running captures.");
  return discovery;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);
  await ensureDir(AUTH_DIR);
  await ensureDir(SCREENSHOTS_ROOT);
  await ensureDir(path.dirname(LOG_PATH));

  if (args.login) {
    await runLogin();
    return;
  }

  if (!fsSync.existsSync(STORAGE_STATE_PATH)) {
    console.error("No storage state at .auth/linear.json. Run: pnpm capture:login");
    process.exit(1);
  }

  const plan = await loadPlan();

  let discovery = await loadDiscovery();
  if (!discovery || args.discover) {
    discovery = await runDiscovery(plan, args);
  }
  if (!discovery.workspace) {
    console.error("Discovery failed to resolve workspace. Edit .auth/discovery.json and retry.");
    process.exit(1);
  }

  const allEntries = flattenEntries(plan);
  const entries = filterEntries(allEntries, args);
  console.log(`Plan: ${allEntries.length} entries total. Selected: ${entries.length}.`);

  const browser = await chromium.launch({ headless: !args.headed });

  let okCount = 0;
  let errCount = 0;
  for (const entry of entries) {
    const themes = pickThemes(entry, plan, args);
    for (const theme of themes) {
      let attempts = 0;
      let lastRec = null;
      while (attempts < 2) {
        attempts++;
        lastRec = await captureEntry({
          browser,
          entry,
          theme,
          plan,
          discovery,
          args,
          baseStorageState: STORAGE_STATE_PATH,
        });
        if (lastRec.status === "ok") break;
        if (entry.retry_optional && attempts === 1) {
          // soft entries: skip retry to keep run fast
          break;
        }
      }
      if (lastRec.status === "ok") okCount++;
      else errCount++;
    }
  }

  await browser.close();
  console.log(`\nDone. ${okCount} ok, ${errCount} errors. Log: ${LOG_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
