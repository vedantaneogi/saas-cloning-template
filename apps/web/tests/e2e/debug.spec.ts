import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test('debug login flow', async ({ page }) => {
  await page.goto(`${BASE}/sign-in`);
  await page.screenshot({ path: 'test-results/01-signin-page.png', fullPage: true });

  await page.fill('[name="email"]', 'frank.miller@acmecorp.com');
  await page.fill('[name="password"]', 'password123');
  await page.screenshot({ path: 'test-results/02-filled-form.png', fullPage: true });

  await page.click('[type="submit"]');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/03-after-submit.png', fullPage: true });

  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());

  // Wait a bit more
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/04-after-wait.png', fullPage: true });
  console.log('URL after wait:', page.url());
});
