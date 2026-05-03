import { expect, type Page } from "@playwright/test";

function blankCard(page: Page) {
  return page
    .getByRole("button", { name: "Start a new presentation" })
    .first();
}

export async function gotoDashboard(page: Page): Promise<void> {
  await page.goto("/");
  await expect(blankCard(page)).toBeVisible();
}

export async function createPresentation(page: Page): Promise<string> {
  await gotoDashboard(page);
  await blankCard(page).click();

  await page.waitForURL(/\/presentation\/d\/[^/]+$/, { timeout: 30_000 });
  const match = page.url().match(/\/presentation\/d\/([^/?#]+)/);
  if (!match) throw new Error(`Could not parse deck id from URL: ${page.url()}`);
  return match[1];
}

export async function openMenuFor(page: Page, title: string): Promise<void> {
  const card = page.locator("div[role='button']", { hasText: title }).first();
  await card.hover();
  await card.getByRole("button").last().click();
}

export async function renamePresentation(
  page: Page,
  currentTitle: string,
  newTitle: string,
): Promise<void> {
  await openMenuFor(page, currentTitle);
  await page.getByRole("menuitem", { name: "Rename" }).click();

  const dialog = page.getByRole("dialog");
  const input = dialog.getByLabel("Title");
  await input.fill(newTitle);
  await dialog.getByRole("button", { name: "Rename" }).click();
  await expect(dialog).toBeHidden();
}

export async function deletePresentation(
  page: Page,
  title: string,
): Promise<void> {
  await openMenuFor(page, title);
  await page.getByRole("menuitem", { name: "Remove" }).click();
}
