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
    return this.page.getByTestId('inbox-tab-focused')
  }
  otherTab() {
    return this.page.getByTestId('inbox-tab-other')
  }

  /** First message row in the list. Testid is `message-row-<id>` so the
   *  selector matches any row regardless of which mailbox is loaded. */
  firstMessage() {
    return this.page.locator('[data-testid^="message-row-"]').first()
  }

  /** Folder row in the sidebar by slug. */
  folderRow(slug: string) {
    return this.page.getByTestId(`folder-row-${slug}`)
  }

  /** Selected message subject in the reading pane header. */
  readingSubject() {
    return this.page.locator('[data-automation-id="MailReadCompose"] h1')
  }

  async openMessage(subject: string) {
    await this.page.getByText(subject).first().click()
  }
}
