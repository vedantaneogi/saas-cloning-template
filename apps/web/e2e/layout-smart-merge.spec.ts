import { test, expect } from "@playwright/test";
import { createPresentation } from "./support/presentations";
import { waitForEditorReady } from "./support/editor";

test.describe("Layout change — smart merge + undo toast", () => {
  test("empty slide: applying Title + Content shows toast and populates placeholders", async ({
    page,
  }) => {
    await createPresentation(page);
    await waitForEditorReady(page);

    await page.getByRole("button", { name: "Layout", exact: true }).click();
    await page.getByRole("button", { name: /Title \+ Content/i }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "Layout applied" }).first(),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: "Undo", exact: true }),
    ).toBeVisible();
  });

  test("user content is preserved when layout changes", async ({ page }) => {
    await createPresentation(page);
    await waitForEditorReady(page);

    // Start with Title + Content layout and type real text into the title.
    await page.getByRole("button", { name: "Layout", exact: true }).click();
    await page.getByRole("button", { name: /Title \+ Content/i }).click();
    await expect(page.getByText("Layout applied")).toBeVisible();

    const canvas = page.locator("[data-slide-id]").first();
    await canvas.getByText("Click to add title").first().click();
    await page.keyboard.type("Hello world");

    // Click away to commit typing.
    await page.mouse.click(10, 10);

    // Switch layouts.
    await page.getByRole("button", { name: "Layout", exact: true }).click();
    await page.getByRole("button", { name: /Two columns/i }).click();

    // The typed title should still be present on the slide.
    await expect(page.getByText("Hello world").first()).toBeVisible();

    // Toast with Undo appears and Undo restores the previous layout state.
    const undoBtn = page.getByRole("button", { name: "Undo", exact: true });
    await expect(undoBtn).toBeVisible();
    await undoBtn.click();

    // After undo, "Hello world" is still there (we only undid the layout swap).
    await expect(page.getByText("Hello world").first()).toBeVisible();
  });

  test("Blank layout keeps user content (smart-merge drops only empty placeholders)", async ({
    page,
  }) => {
    await createPresentation(page);
    await waitForEditorReady(page);

    // Seed with Title layout then add real content to title.
    await page.getByRole("button", { name: "Layout", exact: true }).click();
    await page.getByRole("button", { name: /^Title$/ }).click();
    await expect(page.getByText("Layout applied")).toBeVisible();

    const canvas = page.locator("[data-slide-id]").first();
    await canvas.getByText(/Presentation title|Click to add title/).first().click();
    await page.keyboard.type("Kept content");
    await page.mouse.click(10, 10);

    await page.getByRole("button", { name: "Layout", exact: true }).click();
    await page.getByRole("button", { name: "Blank", exact: true }).click();

    await expect(page.getByText("Kept content").first()).toBeVisible();
  });
});
