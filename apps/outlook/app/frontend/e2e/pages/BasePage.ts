import type { Page } from '@playwright/test'

/**
 * Common ancestor for every page object. Centralizes the
 * goto + wait-for-page-ready pattern so specs read as
 * one-call setups: `await new InboxPage(page).goto()`.
 */
export abstract class BasePage {
  abstract readonly url: string
  /** The testid on the page's root element — also doubles as the loaded indicator. */
  abstract readonly pageTestId: string

  constructor(protected readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(this.url)
    await this.waitForLoaded()
  }

  async waitForLoaded(): Promise<void> {
    await this.page.getByTestId(this.pageTestId).waitFor({ state: 'visible' })
  }
}
