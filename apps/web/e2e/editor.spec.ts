import { test, expect } from "@playwright/test";
import { createPresentation } from "./support/presentations";
import {
  addSlideViaContextMenu,
  countSlides,
  waitForEditorReady,
} from "./support/editor";

test.describe("Editor core", () => {
  test("opens the editor for a new deck with a default slide", async ({
    page,
  }) => {
    await createPresentation(page);
    await waitForEditorReady(page);
    expect(await countSlides(page)).toBeGreaterThanOrEqual(1);
  });

  test("adds a new slide via the thumbnail options menu", async ({ page }) => {
    await createPresentation(page);
    await waitForEditorReady(page);

    const before = await countSlides(page);
    await addSlideViaContextMenu(page);

    await expect
      .poll(() => countSlides(page), { timeout: 10_000 })
      .toBe(before + 1);
  });

  test("renames the deck via the title input and persists on reload", async ({
    page,
  }) => {
    const deckId = await createPresentation(page);
    await waitForEditorReady(page);

    const title = page.getByLabel("Presentation title");
    const newName = `Editor Title ${Date.now()}`;
    await title.click();
    await title.fill(newName);
    await title.blur();

    await page.goto(`/presentation/d/${deckId}`);
    await waitForEditorReady(page);
    await expect(page.getByLabel("Presentation title")).toHaveValue(newName);
  });
});
