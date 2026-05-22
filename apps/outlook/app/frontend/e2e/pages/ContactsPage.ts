import type { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class ContactsPage extends BasePage {
  readonly url = '/contacts'
  readonly pageTestId = 'contacts-page'

  constructor(page: Page) {
    super(page)
  }

  newContactButton() {
    return this.page.getByLabel('New contact')
  }

  contactRow(name: string) {
    return this.page.getByText(name).first()
  }
}
