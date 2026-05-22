import type { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class MailPage extends BasePage {
  readonly url: string
  readonly pageTestId = 'mail-page'

  constructor(page: Page, folder: string = 'inbox') {
    super(page)
    this.url = `/mail/${folder}`
  }

  /** Inbox tab toggle — Focused vs Other. */
  focusedTab() {
    return this.page.getByRole('tab', { name: 'Focused' })
  }
  otherTab() {
    return this.page.getByRole('tab', { name: 'Other' })
  }

  /** First message row in the list (use for spec sanity checks). */
  firstMessage() {
    return this.page
      .locator('[aria-label="Message list"]')
      .getByRole('button')
      .first()
  }

  /** Selected message subject in the reading pane header. */
  readingSubject() {
    return this.page.locator('[data-automation-id="MailReadCompose"] h1')
  }

  async openMessage(subject: string) {
    await this.page.getByText(subject).first().click()
  }
}
