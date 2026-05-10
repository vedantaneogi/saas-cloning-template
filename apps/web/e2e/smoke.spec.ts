import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveTitle(/DocuSign/i);
  });

  test("agreements page loads", async ({ page }) => {
    await page.goto("/agreements");
    await expect(page.locator("text=START").or(page.locator("text=Inbox"))).toBeVisible({
      timeout: 10_000,
    });
  });

  test("templates page loads", async ({ page }) => {
    await page.goto("/templates");
    await expect(
      page.locator("text=My Templates").or(page.locator("text=Create Template")),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("reports page loads", async ({ page }) => {
    await page.goto("/reports");
    await expect(
      page.locator("text=Administrator Dashboard").or(page.locator("text=DASHBOARDS")),
    ).toBeVisible({ timeout: 10_000 });
  });
});
