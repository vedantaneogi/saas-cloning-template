import { expect, type Page } from "@playwright/test";

export async function waitForEditorReady(page: Page): Promise<void> {
  await expect(page.getByLabel("Presentation title")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.locator("aside[aria-label='Slide list'] li[data-slide-id]").first(),
  ).toBeVisible();
}

export async function countSlides(page: Page): Promise<number> {
  return page.locator("aside[aria-label='Slide list'] li[data-slide-id]").count();
}

export async function addSlideViaContextMenu(page: Page): Promise<void> {
  const firstThumb = page
    .locator("aside[aria-label='Slide list'] li[data-slide-id]")
    .first();
  const moreBtn = firstThumb.getByRole("button", { name: /Slide \d+ options/ });
  await moreBtn.click();

  await page.getByRole("menuitem", { name: "New slide" }).click();
  await expect(page.getByRole("menu")).toBeHidden();
}
