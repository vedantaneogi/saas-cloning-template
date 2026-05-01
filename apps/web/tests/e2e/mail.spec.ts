import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const API  = process.env.API_URL  || 'http://localhost:8000';

test.describe('Mail — P0 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/sign-in`);
    await page.fill('[name="email"]', 'frank.miller@acmecorp.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('[type="submit"]');
    await page.waitForURL(`${BASE}/mail/inbox`);
  });

  test('Three-pane layout is visible', async ({ page }) => {
    await expect(page.locator('[aria-label="Folder tree"]')).toBeVisible();
    await expect(page.locator('[aria-label="Message list"]')).toBeVisible();
    await expect(page.locator('[aria-label="Reading pane"]')).toBeVisible();
  });

  test('Folder navigation shows system folders', async ({ page }) => {
    for (const folder of ['Inbox', 'Drafts', 'Sent Items', 'Archive', 'Junk Email', 'Deleted Items']) {
      await expect(page.getByRole('link', { name: folder }).first()).toBeVisible();
    }
  });

  test('Click message to open in reading pane', async ({ page }) => {
    await page.locator('[aria-label="Message list"] [role="listitem"]').first().click();
    await expect(page.locator('[aria-label="Reading pane"]')).toBeVisible();
  });

  test('Compose new email', async ({ page }) => {
    await page.locator('[aria-label="New mail"]').first().click();
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
    await page.locator('[aria-label="To"]').fill('bob.smith@acmecorp.com');
    await page.keyboard.press('Enter');
    await page.locator('[aria-label="Subject"]').fill('Test email');
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.type('Hello world.');
    await page.locator('button:has-text("Send")').first().click();
  });

  test('Reply to a message', async ({ page }) => {
    await page.locator('[aria-label="Message list"] [role="listitem"]').first().click();
    await page.locator('[aria-label="Reply to message"], [aria-label="Reply"]').first().click();
    // Inline reply composer should be visible
    await expect(page.locator('[aria-label="Send reply"]').first()).toBeVisible();
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
    await page.getByRole('link', { name: /Sent Items/i }).first().click();
    await expect(page).toHaveURL(/\/mail\/sent/);
  });

  test('Navigate to Drafts', async ({ page }) => {
    await page.getByRole('link', { name: /Drafts/i }).first().click();
    await expect(page).toHaveURL(/\/mail\/drafts/);
  });
});
