import { test, expect } from "@playwright/test";
import {
  createPresentation,
  deletePresentation,
  gotoDashboard,
  renamePresentation,
} from "./support/presentations";

test.describe("Dashboard CRUD", () => {
  test("creates a new presentation from the FAB and opens the editor", async ({
    page,
  }) => {
    const deckId = await createPresentation(page);
    expect(deckId).toBeTruthy();
    await expect(page.getByLabel("Presentation title")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("renames a presentation from the card menu", async ({ page }) => {
    await createPresentation(page);
    await gotoDashboard(page);

    const originalTitle = "Untitled presentation";
    const newTitle = `Renamed ${Date.now()}`;

    await renamePresentation(page, originalTitle, newTitle);

    await expect(page.getByText(newTitle).first()).toBeVisible();
  });

  test("removes a presentation from the card menu", async ({ page }) => {
    await createPresentation(page);
    await gotoDashboard(page);

    const uniqueTitle = `To delete ${Date.now()}`;
    await renamePresentation(page, "Untitled presentation", uniqueTitle);
    await expect(page.getByText(uniqueTitle).first()).toBeVisible();

    await deletePresentation(page, uniqueTitle);
    await expect(page.getByText(uniqueTitle)).toHaveCount(0);
  });
});
