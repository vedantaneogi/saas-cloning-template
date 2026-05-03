import { test, expect } from "@playwright/test";
import { createPresentation } from "./support/presentations";
import { waitForEditorReady } from "./support/editor";

test.describe("Share & Comments", () => {
  test("opens the share modal from the Share button", async ({ page }) => {
    await createPresentation(page);
    await waitForEditorReady(page);

    await page
      .getByRole("group", { name: "Share" })
      .getByRole("button", { name: "Share", exact: true })
      .click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("toggles the comments panel from the topbar button", async ({ page }) => {
    await createPresentation(page);
    await waitForEditorReady(page);

    const commentsBtn = page.getByRole("button", {
      name: "Comments",
      exact: true,
    });
    await commentsBtn.click();

    const panel = page.getByRole("complementary", { name: "Comments panel" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("All comments")).toBeVisible();

    await panel.getByRole("button", { name: "Close comments" }).click();
    await expect(panel).toBeHidden();
  });
});
