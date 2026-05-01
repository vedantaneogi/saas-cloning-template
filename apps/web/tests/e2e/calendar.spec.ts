import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Calendar — P0 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/sign-in`);
    await page.fill('[name="email"]', 'frank.miller@acmecorp.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('[type="submit"]');
    await page.waitForURL(`${BASE}/mail/inbox`);
    await page.goto(`${BASE}/calendar`);
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
    await page.locator('[aria-label="New event"]').first().click();
    await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 10000 });
    await page.locator('[aria-label="Event title"]').fill('Playwright Test Event');
    await page.locator('[aria-label="Save event"]').first().click();
  });
});
