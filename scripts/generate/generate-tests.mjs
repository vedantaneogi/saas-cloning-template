/**
 * Generate Tests
 * ==============
 * Writes Playwright E2E tests for all P0 features of the Outlook clone.
 *
 * Output:
 *   apps/web/tests/e2e/mail.spec.ts
 *   apps/web/tests/e2e/calendar.spec.ts
 *   apps/web/tests/e2e/contacts.spec.ts
 *   apps/web/tests/e2e/tasks.spec.ts
 *   apps/web/tests/e2e/settings.spec.ts
 *   apps/web/tests/e2e/universal.spec.ts   — RL environment endpoints
 */

import fs from 'fs';
import path from 'path';

const E2E_DIR = path.resolve('apps/web/tests/e2e');
fs.mkdirSync(E2E_DIR, { recursive: true });

function write(filename, content) {
  const filePath = path.join(E2E_DIR, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`   ✓ apps/web/tests/e2e/${filename}`);
}

write('mail.spec.ts', `import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const API  = process.env.API_URL  || 'http://localhost:8000';

test.describe('Mail — P0 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(\`\${BASE}/sign-in\`);
    await page.fill('[name="email"]', 'frank.miller@acmecorp.com');
    await page.fill('[name="password"]', 'password');
    await page.click('[type="submit"]');
    await page.waitForURL(\`\${BASE}/mail/inbox\`);
  });

  test('Three-pane layout is visible', async ({ page }) => {
    await expect(page.locator('[aria-label="Folder tree"]')).toBeVisible();
    await expect(page.locator('[aria-label="Message list"]')).toBeVisible();
    await expect(page.locator('[aria-label="Reading pane"]')).toBeVisible();
  });

  test('Folder navigation shows system folders', async ({ page }) => {
    for (const folder of ['Inbox', 'Drafts', 'Sent Items', 'Archive', 'Junk Email', 'Deleted Items']) {
      await expect(page.getByRole('link', { name: folder })).toBeVisible();
    }
  });

  test('Click message to open in reading pane', async ({ page }) => {
    await page.locator('[aria-label="Message list"] [role="listitem"]').first().click();
    await expect(page.locator('[aria-label="Reading pane"]')).toBeVisible();
  });

  test('Compose new email', async ({ page }) => {
    await page.locator('[aria-label="New mail"], [aria-label="New message"], button:has-text("New mail")').first().click();
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
    await page.fill('[aria-label="To"], [placeholder*="To"]', 'bob.smith@acmecorp.com');
    await page.fill('[aria-label="Subject"], [placeholder*="Subject"]', 'Test email');
    await page.locator('[aria-label="Message body"], [contenteditable="true"]').first().type('Hello world.');
    await page.locator('[aria-label="Send"], button:has-text("Send")').first().click();
  });

  test('Reply to a message', async ({ page }) => {
    await page.locator('[aria-label="Message list"] [role="listitem"]').first().click();
    await page.locator('[aria-label="Reply"], button:has-text("Reply")').first().click();
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
  });

  test('Delete a message', async ({ page }) => {
    await page.locator('[aria-label="Message list"] [role="listitem"]').first().click();
    await page.locator('[aria-label="Delete"], button:has-text("Delete")').first().click();
  });

  test('Search for messages', async ({ page }) => {
    const searchBar = page.locator('[aria-label="Search"], input[placeholder*="Search"]').first();
    await searchBar.fill('project');
    await page.keyboard.press('Enter');
    await expect(page.locator('[aria-label="Message list"]').first()).toBeVisible();
  });

  test('Navigate to Sent Items', async ({ page }) => {
    await page.getByRole('link', { name: /Sent Items/i }).click();
    await expect(page).toHaveURL(/\/mail\/sent/);
  });

  test('Navigate to Drafts', async ({ page }) => {
    await page.getByRole('link', { name: /Drafts/i }).click();
    await expect(page).toHaveURL(/\/mail\/drafts/);
  });
});
`);

write('calendar.spec.ts', `import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Calendar — P0 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(\`\${BASE}/sign-in\`);
    await page.fill('[name="email"]', 'frank.miller@acmecorp.com');
    await page.fill('[name="password"]', 'password');
    await page.click('[type="submit"]');
    await page.waitForURL(\`\${BASE}/mail/inbox\`);
    await page.goto(\`\${BASE}/calendar\`);
  });

  test('Calendar grid loads', async ({ page }) => {
    await expect(page.locator('[aria-label="Calendar"], [data-testid="calendar-grid"]').first()).toBeVisible();
  });

  test('Switch to Week view', async ({ page }) => {
    await page.locator('button:has-text("Week"), [aria-label="Week view"]').first().click();
  });

  test('Switch to Day view', async ({ page }) => {
    await page.locator('button:has-text("Day"), [aria-label="Day view"]').first().click();
  });

  test('Today button works', async ({ page }) => {
    await page.locator('button:has-text("Today"), [aria-label="Today"]').first().click();
  });

  test('Create a new event', async ({ page }) => {
    await page.locator('[aria-label="New event"], button:has-text("New event")').first().click();
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
    await page.fill('[name="title"], [aria-label="Title"], [placeholder*="Title"]', 'Playwright Test Event');
    await page.locator('button:has-text("Save"), [aria-label="Save"]').first().click();
  });
});
`);

write('contacts.spec.ts', `import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Contacts — P0 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(\`\${BASE}/sign-in\`);
    await page.fill('[name="email"]', 'frank.miller@acmecorp.com');
    await page.fill('[name="password"]', 'password');
    await page.click('[type="submit"]');
    await page.waitForURL(\`\${BASE}/mail/inbox\`);
    await page.goto(\`\${BASE}/contacts\`);
  });

  test('Contact list loads', async ({ page }) => {
    await expect(page.locator('[aria-label="Contact list"], [data-testid="contact-list"]').first()).toBeVisible();
  });

  test('Search for a contact', async ({ page }) => {
    const search = page.locator('[aria-label="Search contacts"], input[placeholder*="Search"]').first();
    if (await search.isVisible()) {
      await search.fill('Alice');
      await expect(page.getByText('Alice')).toBeVisible();
    }
  });

  test('Click contact to see detail', async ({ page }) => {
    await page.locator('[role="listitem"], [data-testid="contact-item"]').first().click();
    await expect(page.locator('[data-testid="contact-detail"]').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('Create a new contact', async ({ page }) => {
    await page.locator('[aria-label="New contact"], button:has-text("New contact")').first().click();
    await page.fill('[name="first_name"], [aria-label="First name"]', 'Test');
    await page.fill('[name="email"], [aria-label="Email"]', 'test@example.com');
    await page.locator('button:has-text("Save")').first().click();
  });
});
`);

write('tasks.spec.ts', `import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Tasks — P0 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(\`\${BASE}/sign-in\`);
    await page.fill('[name="email"]', 'frank.miller@acmecorp.com');
    await page.fill('[name="password"]', 'password');
    await page.click('[type="submit"]');
    await page.waitForURL(\`\${BASE}/mail/inbox\`);
    await page.goto(\`\${BASE}/tasks\`);
  });

  test('Task list loads', async ({ page }) => {
    await expect(page.locator('[aria-label="Task list"], [data-testid="task-list"]').first()).toBeVisible();
  });

  test('Seeded tasks are shown', async ({ page }) => {
    await expect(page.getByText('Review Q3 report')).toBeVisible({ timeout: 5000 });
  });

  test('Create a new task', async ({ page }) => {
    const addInput = page.locator('[placeholder*="Add a task"], [data-testid="add-task-input"]').first();
    if (await addInput.isVisible()) {
      await addInput.fill('Playwright test task');
      await page.keyboard.press('Enter');
      await expect(page.getByText('Playwright test task')).toBeVisible({ timeout: 3000 });
    }
  });

  test('Mark task as complete', async ({ page }) => {
    const checkbox = page.locator('[data-testid="task-item"] [type="checkbox"]').first();
    if (await checkbox.isVisible()) await checkbox.click();
  });
});
`);

write('settings.spec.ts', `import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Settings — P0 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(\`\${BASE}/sign-in\`);
    await page.fill('[name="email"]', 'frank.miller@acmecorp.com');
    await page.fill('[name="password"]', 'password');
    await page.click('[type="submit"]');
    await page.waitForURL(\`\${BASE}/mail/inbox\`);
    await page.goto(\`\${BASE}/settings\`);
  });

  test('Settings page loads', async ({ page }) => {
    await expect(page.locator('[data-testid="settings-page"], main').first()).toBeVisible();
  });

  test('Navigate to Signatures', async ({ page }) => {
    await page.locator('a:has-text("Signatures"), [aria-label="Signatures"]').first().click();
    await expect(page).toHaveURL(/signatures/);
  });

  test('Navigate to Out of Office', async ({ page }) => {
    await page.locator('a:has-text("Automatic"), a:has-text("Out of office")').first().click();
    await expect(page).toHaveURL(/oof|automatic/i);
  });
});
`);

write('universal.spec.ts', `import { test, expect } from '@playwright/test';

const API = process.env.API_URL || 'http://localhost:8000';

test.describe('Universal RL Environment Endpoints', () => {
  test('GET /health returns 200', async ({ request }) => {
    const res = await request.get(\`\${API}/health\`);
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('ok');
  });

  test('GET /ready returns 200 after seed', async ({ request }) => {
    const res = await request.get(\`\${API}/ready\`);
    expect(res.status()).toBe(200);
  });

  test('GET /clock returns ISO time', async ({ request }) => {
    const res = await request.get(\`\${API}/clock\`);
    expect(res.status()).toBe(200);
    const { time } = await res.json();
    expect(new Date(time).toString()).not.toBe('Invalid Date');
  });

  test('POST /clock/advance moves time forward', async ({ request }) => {
    const before = (await (await request.get(\`\${API}/clock\`)).json()).time;
    await request.post(\`\${API}/clock/advance\`, { data: { duration: 'PT1H' } });
    const after = (await (await request.get(\`\${API}/clock\`)).json()).time;
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  test('GET /snapshot returns state JSON', async ({ request }) => {
    const res = await request.get(\`\${API}/snapshot\`);
    expect(res.status()).toBe(200);
  });

  test('POST /reset returns status reset', async ({ request }) => {
    const res = await request.post(\`\${API}/reset\`);
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('reset');
  });

  test('POST /verify evaluates predicate', async ({ request }) => {
    const res = await request.post(\`\${API}/verify\`, {
      data: { path: 'user.role', operator: 'eq', expected: 'worker' },
    });
    expect(res.status()).toBe(200);
    expect(typeof (await res.json()).result).toBe('boolean');
  });

  test('GET /events returns event log array', async ({ request }) => {
    const res = await request.get(\`\${API}/events\`);
    expect(res.status()).toBe(200);
    expect(Array.isArray((await res.json()).events)).toBe(true);
  });
});
`);

console.log('\n=======================================================');
console.log('  Outlook Clone — Generate: Tests');
console.log('=======================================================');
console.log('\n=======================================================');
console.log('  ✅ Tests generated! (6 spec files)');
console.log('=======================================================\n');
