import type { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class SettingsPage extends BasePage {
  readonly url: string
  readonly pageTestId = 'settings-page'

  constructor(page: Page, section: string = 'general') {
    super(page)
    this.url = section === 'general' ? '/settings' : `/settings/${section}`
  }

  sectionLink(label: string) {
    return this.page.getByRole('link', { name: label })
  }
}
