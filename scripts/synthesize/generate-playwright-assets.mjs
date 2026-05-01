/**
 * Synthesize Step 1 — Generate Playwright Assets
 * ================================================
 * Reads research/normalized/ and generates Playwright page objects,
 * locator maps, and test fixtures into apps/web/tests/
 *
 * Output:
 *   apps/web/tests/pages/          — Page Object classes
 *   apps/web/tests/fixtures/       — shared test fixtures
 *   apps/web/tests/locators/       — locator maps per page
 */

import fs from 'fs';
import path from 'path';

const NORMALIZED_DIR   = path.resolve('research/normalized');
const TESTS_DIR        = path.resolve('apps/web/tests');
const PAGES_DIR        = path.join(TESTS_DIR, 'pages');
const LOCATORS_DIR     = path.join(TESTS_DIR, 'locators');
const FIXTURES_DIR     = path.join(TESTS_DIR, 'fixtures');

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`   ✓ ${path.relative(process.cwd(), filePath)}`);
}

function toPascalCase(str) {
  return str.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function toCamelCase(str) {
  const p = toPascalCase(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

// ---------------------------------------------------------------------------
// Generate page object class
// ---------------------------------------------------------------------------
function generatePageObject(page, locators, components) {
  const className = toPascalCase(page.label) + 'Page';
  const locatorEntries = (locators || [])
    .filter(l => l.selector)
    .slice(0, 20)
    .map(l => {
      const name = toCamelCase(
        (l.ariaLabel || l.text || l.selector)
          .replace(/[^a-zA-Z0-9 ]/g, ' ')
          .trim()
          .split(' ')
          .slice(0, 4)
          .join('_')
      );
      return `  get ${name}() { return this.page.locator(${JSON.stringify(l.selector)}); }`;
    })
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe
    .join('\n');

  return `import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object — ${page.label}
 * URL: ${page.url}
 * Components: ${(components?.inferredComponents || []).join(', ') || 'N/A'}
 */
export class ${className} {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('${page.url}');
    await this.page.waitForLoadState('networkidle');
  }

  // --- Locators ---
${locatorEntries || '  // No locators extracted for this page'}

  // --- Actions ---
  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: \`research/validation/\${name}.png\` });
  }
}
`;
}

// ---------------------------------------------------------------------------
// Generate locator map
// ---------------------------------------------------------------------------
function generateLocatorMap(pages, locatorHints) {
  const byPage = locatorHints?.byPage || [];
  const entries = byPage.map(p => {
    const locators = p.locators
      .filter(l => l.selector)
      .slice(0, 15)
      .map(l => {
        const key = (l.ariaLabel || l.text || 'element')
          .replace(/[^a-zA-Z0-9]/g, '_')
          .toLowerCase()
          .slice(0, 30);
        return `  ${JSON.stringify(key)}: ${JSON.stringify(l.selector)}`;
      })
      .join(',\n');
    return `  ${JSON.stringify(p.page)}: {\n${locators}\n  }`;
  }).join(',\n');

  return `/**
 * Locator Map — Generated from research/normalized/locator-hints.json
 * Use these selectors in Playwright tests for stable element targeting.
 */
export const LOCATORS: Record<string, Record<string, string>> = {
${entries}
};
`;
}

// ---------------------------------------------------------------------------
// Generate shared fixture
// ---------------------------------------------------------------------------
function generateFixture() {
  return `import { test as base } from '@playwright/test';
import { MailInboxPage } from './pages/MailInboxPage';
import { CalendarMonthPage } from './pages/CalendarMonthPage';
import { ContactsListPage } from './pages/ContactsListPage';
import { TasksListPage } from './pages/TasksListPage';

/**
 * Extended Playwright fixtures for Outlook clone tests.
 */
type OutlookFixtures = {
  mailInbox: MailInboxPage;
  calendar: CalendarMonthPage;
  contacts: ContactsListPage;
  tasks: TasksListPage;
  loggedIn: void;
};

export const test = base.extend<OutlookFixtures>({
  loggedIn: async ({ page }, use) => {
    // Authenticate against our clone app
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[type="submit"]');
    await page.waitForURL('**/mail/inbox');
    await use();
  },

  mailInbox: async ({ page, loggedIn }, use) => {
    await use(new MailInboxPage(page));
  },

  calendar: async ({ page, loggedIn }, use) => {
    await use(new CalendarMonthPage(page));
  },

  contacts: async ({ page, loggedIn }, use) => {
    await use(new ContactsListPage(page));
  },

  tasks: async ({ page, loggedIn }, use) => {
    await use(new TasksListPage(page));
  },
});

export { expect } from '@playwright/test';
`;
}

// ---------------------------------------------------------------------------
// Generate seed fixture JSON
// ---------------------------------------------------------------------------
function generateSeedFixture() {
  return `{
  "$schema": "rl-env/v1",
  "rng_seed": 42,
  "feature_flags": {
    "focused_inbox": true,
    "schedule_send": true,
    "snooze": true,
    "scheduling_assistant": true,
    "quick_steps": true,
    "sweep": true
  },
  "permission_profile": {
    "role": "worker"
  },
  "world": {
    "people": [
      { "id": "person-001", "first_name": "Alice", "last_name": "Johnson", "email": "alice.johnson@acmecorp.com", "phone": "+1-555-0101", "company": "Acme Corp", "job_title": "Product Manager" },
      { "id": "person-002", "first_name": "Bob", "last_name": "Smith", "email": "bob.smith@acmecorp.com", "phone": "+1-555-0102", "company": "Acme Corp", "job_title": "Engineering Manager" },
      { "id": "person-003", "first_name": "Carol", "last_name": "Williams", "email": "carol.williams@vendor.com", "phone": "+1-555-0103", "company": "Vendor Inc", "job_title": "Account Executive" },
      { "id": "person-004", "first_name": "David", "last_name": "Brown", "email": "david.brown@acmecorp.com", "phone": "+1-555-0104", "company": "Acme Corp", "job_title": "Designer" },
      { "id": "person-005", "first_name": "Emma", "last_name": "Davis", "email": "emma.davis@newsletter.com", "phone": null, "company": "NewsletterCo", "job_title": "Marketing" }
    ],
    "companies": [
      { "id": "company-001", "name": "Acme Corp", "domain": "acmecorp.com" },
      { "id": "company-002", "name": "Vendor Inc", "domain": "vendor.com" }
    ]
  },
  "app_data": {
    "active_user": {
      "world_id": "person-001",
      "role": "worker",
      "timezone": "America/New_York",
      "locale": "en-US"
    }
  }
}
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n=======================================================');
  console.log('  Outlook Clone — Synthesize: Playwright Assets');
  console.log('=======================================================\n');

  const routes       = readJson(path.join(NORMALIZED_DIR, 'routes.json'))       || [];
  const components   = readJson(path.join(NORMALIZED_DIR, 'components.json'))   || [];
  const locatorHints = readJson(path.join(NORMALIZED_DIR, 'locator-hints.json'))|| { byPage: [] };

  [PAGES_DIR, LOCATORS_DIR, FIXTURES_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));
  fs.mkdirSync(path.resolve('research/validation'), { recursive: true });

  console.log('📄 Generating page objects...\n');

  // Page objects
  for (const page of routes) {
    const pageComponents = components.find(c => c.page === page.label);
    const pageLocators   = (locatorHints.byPage || []).find(p => p.page === page.label);
    const className      = toPascalCase(page.label) + 'Page';
    const content        = generatePageObject(page, pageLocators?.locators || [], pageComponents);
    write(path.join(PAGES_DIR, `${className}.ts`), content);
  }

  // Locator map
  console.log('\n📌 Generating locator map...\n');
  write(path.join(LOCATORS_DIR, 'locator-map.ts'), generateLocatorMap(routes, locatorHints));

  // Fixtures
  console.log('\n🔧 Generating fixtures...\n');
  write(path.join(FIXTURES_DIR, 'outlook-fixtures.ts'), generateFixture());
  write(path.join(FIXTURES_DIR, 'seed.json'), generateSeedFixture());

  console.log('\n=======================================================');
  console.log(`  ✅ Playwright assets generated!`);
  console.log(`  Pages:    apps/web/tests/pages/ (${routes.length} files)`);
  console.log(`  Locators: apps/web/tests/locators/locator-map.ts`);
  console.log(`  Fixtures: apps/web/tests/fixtures/`);
  console.log('=======================================================\n');
}

main().catch(err => {
  console.error('❌ Synthesize (playwright assets) failed:', err);
  process.exit(1);
});
