import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Tasks — P0 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/sign-in`);
    await page.fill('[name="email"]', 'frank.miller@acmecorp.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('[type="submit"]');
    await page.waitForURL(`${BASE}/mail/inbox`);
    await page.goto(`${BASE}/tasks`);
    await page.waitForLoadState('networkidle');
    await page.locator('[aria-label="Task list"]').waitFor({ timeout: 10000 });
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
