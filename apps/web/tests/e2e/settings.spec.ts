import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Settings — P0 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/sign-in`);
    await page.fill('[name="email"]', 'frank.miller@acmecorp.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('[type="submit"]');
    await page.waitForURL(`${BASE}/mail/inbox`);
    await page.goto(`${BASE}/settings`);
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
