import { chromium, type FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";

const API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8000";
const WEB_URL = process.env.PLAYWRIGHT_WEB_URL ?? "http://localhost:3000";
const AUTH_FILE = path.resolve(__dirname, ".auth/user.json");

async function globalSetup(config: FullConfig) {
  // Ensure .auth directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Log in via the sign-in page
    await page.goto(`${WEB_URL}/sign-in`);

    // Wait for the email step
    await page.waitForSelector('input[type="email"]', { timeout: 15_000 });
    await page.fill('input[type="email"]', "test@example.com");

    // Click Next / Continue
    const nextBtn = page.locator('button:has-text("NEXT"), button:has-text("Next"), button:has-text("Continue")').first();
    await nextBtn.click();

    // Wait for password field
    await page.waitForSelector('input[type="password"]', { timeout: 10_000 });
    await page.fill('input[type="password"]', "password");

    // Click Log In
    const loginBtn = page.locator('button:has-text("LOG IN"), button:has-text("Log In"), button[type="submit"]').first();
    await loginBtn.click();

    // Wait for redirect to home
    await page.waitForURL(`${WEB_URL}/home`, { timeout: 15_000 });

    // Save storage state
    await context.storageState({ path: AUTH_FILE });
    console.log("✓ Global setup: authenticated as test@example.com");
  } catch (err) {
    console.warn("⚠ Global setup: login failed, creating empty auth state.", err);
    // Write an empty storage state so Playwright doesn't crash
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({ cookies: [], origins: [] }, null, 2),
    );
  } finally {
    await browser.close();
  }
}

export default globalSetup;
