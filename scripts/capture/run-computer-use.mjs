/**
 * Capture Script — Microsoft Outlook Clone
 * =========================================
 * Uses Playwright to log into the real Outlook account and capture:
 *  - Screenshots (initial_view.png)
 *  - Full DOM (dom.html)
 *  - ARIA accessibility tree (aria-snapshot.yaml)
 *  - Interactive elements map (interactive-elements.json)
 *  - Metadata (metadata.json)
 *
 * Output: research/raw/<session-id>/ per captured page/view
 *
 * Usage:
 *   node scripts/capture/run-computer-use.mjs
 *
 * Environment (optional overrides via .env or shell):
 *   OUTLOOK_EMAIL    — defaults to tbalerts@axiomglobal.com
 *   OUTLOOK_PASSWORD — set in shell, not committed
 *   HEADLESS         — set to "true" to run headless (default: false for 2FA)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const OUTLOOK_URL   = 'https://outlook.office.com';
const EMAIL         = process.env.OUTLOOK_EMAIL    || 'tbalerts@axiomglobal.com';
const PASSWORD      = process.env.OUTLOOK_PASSWORD || 'Ck;/=T6A:^,2Www';
const HEADLESS      = process.env.HEADLESS === 'true';
const OUTPUT_BASE   = path.resolve('research/raw');
const VIEWPORT      = { width: 1440, height: 900 };
const SESSION_DATE  = new Date().toISOString();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSessionId() {
  return crypto.randomUUID();
}

function sessionDir(sessionId) {
  const dir = path.join(OUTPUT_BASE, sessionId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function captureSession(page, sessionId, url, label) {
  const dir = sessionDir(sessionId);
  console.log(`\n📸 Capturing: ${label} (${url})`);

  // Screenshot
  await page.screenshot({ path: path.join(dir, 'initial_view.png'), fullPage: false });

  // DOM
  const domHtml = await page.content();
  fs.writeFileSync(path.join(dir, 'dom.html'), domHtml, 'utf8');

  // ARIA snapshot (Playwright 1.46+ API)
  let ariaYaml = '';
  try {
    ariaYaml = await page.locator('body').ariaSnapshot();
  } catch {
    ariaYaml = '# aria snapshot unavailable for this page';
  }
  fs.writeFileSync(path.join(dir, 'aria-snapshot.yaml'), ariaYaml, 'utf8');

  // Interactive elements
  const elements = await page.evaluate(() => {
    const results = [];
    const selectors = 'a, button, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="radio"], [role="combobox"], [role="listitem"]';
    document.querySelectorAll(selectors).forEach(el => {
      const entry = {
        tag: el.tagName.toLowerCase(),
        text: el.innerText?.trim().slice(0, 120) || el.getAttribute('aria-label') || '',
        role: el.getAttribute('role') || null,
        type: el.getAttribute('type') || null,
        href: el.getAttribute('href') || null,
        placeholder: el.getAttribute('placeholder') || null,
        ariaLabel: el.getAttribute('aria-label') || null,
        id: el.id || null,
        classes: el.className?.slice(0, 80) || null,
      };
      // Clean up nulls
      Object.keys(entry).forEach(k => entry[k] === null && delete entry[k]);
      results.push(entry);
    });
    return results;
  });
  fs.writeFileSync(path.join(dir, 'interactive-elements.json'), JSON.stringify(elements, null, 2), 'utf8');

  // Metadata
  const title = await page.title();
  const metadata = {
    url,
    label,
    timestamp: SESSION_DATE,
    sessionId,
    title,
    artifacts: ['initial_view.png', 'dom.html', 'aria-snapshot.yaml', 'interactive-elements.json'],
  };
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

  console.log(`   ✓ Saved to research/raw/${sessionId}/`);
  return sessionId;
}


async function waitForLogin(page) {
  console.log('\n⏳ Waiting for Outlook inbox to load (up to 3 minutes)...');
  console.log('   Complete 2FA in the browser window if prompted.\n');
  // Wait until Outlook's main mail UI is visible — indicates successful login
  const selectors = [
    '[aria-label="Message list"]',
    '[role="main"]',
    'div[class*="mailList"]',
    'div[class*="foldersPane"]',
    '[data-app-section="MailList"]',
  ];
  const combined = selectors.join(', ');
  await page.waitForSelector(combined, { timeout: 180000 });
  console.log('   ✅ Login detected — inbox is visible.\n');
}

async function safeNavigate(page, url, waitFor = 'networkidle') {
  try {
    await page.goto(url, { waitUntil: waitFor, timeout: 30000 });
  } catch {
    // Some Outlook pages don't fully settle — just wait a moment
    await page.waitForTimeout(3000);
  }
}

// ---------------------------------------------------------------------------
// Pages to capture
// Defined as { label, path, setup? }
// setup: async function to perform actions before capture (e.g., open compose)
// ---------------------------------------------------------------------------
const CAPTURE_TARGETS = [
  // --- Mail ---
  {
    label: 'mail-inbox',
    path: '/mail/inbox',
    waitFor: '[aria-label="Message list"]',
  },
  {
    label: 'mail-reading-pane',
    path: '/mail/inbox',
    waitFor: '[aria-label="Message list"]',
    setup: async (page) => {
      // Click the first message to open it in the reading pane
      const firstMsg = page.locator('[role="listitem"]').first();
      if (await firstMsg.count() > 0) await firstMsg.click();
      await page.waitForTimeout(2000);
    },
  },
  {
    label: 'mail-compose',
    path: '/mail/inbox',
    waitFor: '[aria-label="Message list"]',
    setup: async (page) => {
      // Click New Message / New mail button
      const newMsg = page.locator('[aria-label="New mail"], [aria-label="New message"], button:has-text("New message"), button:has-text("New mail")').first();
      if (await newMsg.count() > 0) {
        await newMsg.click();
        await page.waitForTimeout(2000);
      }
    },
  },
  {
    label: 'mail-sent',
    path: '/mail/sentitems',
    waitFor: 'networkidle',
  },
  {
    label: 'mail-drafts',
    path: '/mail/drafts',
    waitFor: 'networkidle',
  },
  {
    label: 'mail-search',
    path: '/mail/inbox',
    waitFor: '[aria-label="Message list"]',
    setup: async (page) => {
      const searchBox = page.locator('[aria-label="Search"], input[placeholder*="Search"]').first();
      if (await searchBox.count() > 0) {
        await searchBox.click();
        await searchBox.fill('project');
        await page.waitForTimeout(2000);
      }
    },
  },
  {
    label: 'mail-folders-sidebar',
    path: '/mail/inbox',
    waitFor: 'networkidle',
  },

  // --- Calendar ---
  {
    label: 'calendar-month',
    path: '/calendar/view/Month',
    waitFor: 'networkidle',
  },
  {
    label: 'calendar-week',
    path: '/calendar/view/Week',
    waitFor: 'networkidle',
  },
  {
    label: 'calendar-day',
    path: '/calendar/view/Day',
    waitFor: 'networkidle',
  },
  {
    label: 'calendar-workweek',
    path: '/calendar/view/WorkWeek',
    waitFor: 'networkidle',
  },
  {
    label: 'calendar-new-event',
    path: '/calendar/view/Month',
    waitFor: 'networkidle',
    setup: async (page) => {
      const newEvent = page.locator('[aria-label="New event"], button:has-text("New event")').first();
      if (await newEvent.count() > 0) {
        await newEvent.click();
        await page.waitForTimeout(2000);
      }
    },
  },

  // --- Contacts ---
  {
    label: 'contacts-list',
    path: '/people',
    waitFor: 'networkidle',
  },
  {
    label: 'contacts-detail',
    path: '/people',
    waitFor: 'networkidle',
    setup: async (page) => {
      const firstContact = page.locator('[role="listitem"]').first();
      if (await firstContact.count() > 0) {
        await firstContact.click();
        await page.waitForTimeout(2000);
      }
    },
  },

  // --- Tasks ---
  {
    label: 'tasks-list',
    path: '/tasks',
    waitFor: 'networkidle',
  },

  // --- Settings ---
  {
    label: 'settings-general',
    path: '/options/general',
    waitFor: 'networkidle',
  },
  {
    label: 'settings-mail',
    path: '/options/mail/layout',
    waitFor: 'networkidle',
  },
  {
    label: 'settings-signatures',
    path: '/options/mail/emailsignature',
    waitFor: 'networkidle',
  },
  {
    label: 'settings-rules',
    path: '/options/mail/rules',
    waitFor: 'networkidle',
  },
  {
    label: 'settings-oof',
    path: '/options/mail/automaticReplies',
    waitFor: 'networkidle',
  },
  {
    label: 'settings-categories',
    path: '/options/general/categories',
    waitFor: 'networkidle',
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('');
  console.log('=======================================================');
  console.log('  Outlook Clone — Capture Phase');
  console.log('=======================================================');
  console.log(`  Target: ${OUTLOOK_URL}`);
  console.log(`  Output: research/raw/`);
  console.log(`  Pages : ${CAPTURE_TARGETS.length}`);
  console.log('=======================================================\n');

  fs.mkdirSync(OUTPUT_BASE, { recursive: true });

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  // ------------------------------------------------------------------
  // Step 1: Navigate to Outlook and log in
  // ------------------------------------------------------------------
  console.log('🔐 Navigating to Outlook login...');
  await page.goto(OUTLOOK_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Fill in email
  try {
    const emailInput = page.locator('input[type="email"], input[name="loginfmt"]').first();
    await emailInput.waitFor({ timeout: 10000 });
    await emailInput.fill(EMAIL);
    await page.locator('input[type="submit"], button:has-text("Next")').first().click();
    await page.waitForTimeout(2000);

    // Fill in password
    const passInput = page.locator('input[type="password"], input[name="passwd"]').first();
    await passInput.waitFor({ timeout: 10000 });
    await passInput.fill(PASSWORD);
    await page.locator('input[type="submit"], button:has-text("Sign in")').first().click();
    await page.waitForTimeout(3000);

    await waitForLogin(page);

    // Handle "Stay signed in?" prompt
    try {
      const staySignedIn = page.locator('input[value="Yes"], button:has-text("Yes")').first();
      if (await staySignedIn.isVisible({ timeout: 3000 })) {
        await staySignedIn.click();
        await page.waitForTimeout(2000);
      }
    } catch {
      // no prompt, continue
    }

  } catch (err) {
    console.log('ℹ️  Could not auto-fill login (may already be logged in):', err.message);
    await waitForLogin(page);
  }

  console.log('\n✅ Login complete. Starting capture...\n');

  // ------------------------------------------------------------------
  // Step 2: Capture each target page
  // ------------------------------------------------------------------
  const manifest = [];

  for (const target of CAPTURE_TARGETS) {
    try {
      const url = `${OUTLOOK_URL}${target.path}`;
      await safeNavigate(page, url, 'domcontentloaded');
      await page.waitForTimeout(2500);

      // Run setup action if defined (e.g., open compose, click first item)
      if (target.setup) {
        try {
          await target.setup(page);
        } catch (e) {
          console.log(`   ⚠  Setup action failed for ${target.label}: ${e.message}`);
        }
      }

      // Wait for specific element if defined
      if (target.waitFor && typeof target.waitFor === 'string' && !target.waitFor.includes('idle')) {
        try {
          await page.waitForSelector(target.waitFor, { timeout: 8000 });
        } catch {
          // Element not found, capture anyway
        }
      }

      const sessionId = makeSessionId();
      await captureSession(page, sessionId, url, target.label);
      manifest.push({ sessionId, label: target.label, url });

    } catch (err) {
      console.log(`   ✗ Failed to capture ${target.label}: ${err.message}`);
    }
  }

  // ------------------------------------------------------------------
  // Step 3: Save capture manifest
  // ------------------------------------------------------------------
  const manifestPath = path.join(OUTPUT_BASE, 'outlook-capture-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    app: 'outlook-clone',
    capturedAt: SESSION_DATE,
    totalSessions: manifest.length,
    sessions: manifest,
  }, null, 2), 'utf8');

  console.log('\n=======================================================');
  console.log(`  ✅ Capture complete! ${manifest.length}/${CAPTURE_TARGETS.length} pages captured.`);
  console.log(`  Manifest: research/raw/outlook-capture-manifest.json`);
  console.log('=======================================================\n');

  await browser.close();
}

main().catch(err => {
  console.error('❌ Capture failed:', err);
  process.exit(1);
});
