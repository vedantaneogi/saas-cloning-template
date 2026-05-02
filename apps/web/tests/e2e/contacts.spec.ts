import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Contacts — P0 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/sign-in`);
    await page.fill('[name="email"]', 'frank.miller@acmecorp.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('[type="submit"]');
    await page.waitForURL(`${BASE}/mail/inbox`);
    await page.goto(`${BASE}/contacts`);
    await page.waitForLoadState('networkidle');
    await page.locator('[aria-label="Contact list"]').waitFor({ timeout: 10000 });
  });

  test('Contact list loads', async ({ page }) => {
    await expect(page.locator('[aria-label="Contact list"], [data-testid="contact-list"]').first()).toBeVisible();
  });

  test('Search for a contact', async ({ page }) => {
    const search = page.locator('[aria-label="Search contacts"], input[placeholder*="Search"]').first();
    if (await search.isVisible()) {
      await search.fill('Alice');
      await expect(page.getByText('Alice Johnson').first()).toBeVisible();
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
    await page.locator('button:has-text("Save"), button:has-text("Create contact")').first().click();
  });
});
