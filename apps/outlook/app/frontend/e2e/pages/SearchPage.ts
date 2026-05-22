import type { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class SearchPage extends BasePage {
  readonly url = '/mail/search'
  readonly pageTestId = 'search-page'

  constructor(page: Page) {
    super(page)
  }

  topbarSearchInput() {
    return this.page.getByLabel('Search')
  }

  filterButton() {
    return this.page.getByLabel('Search filters')
  }

  resultRow(text: string) {
    return this.page.getByText(text).first()
  }
}
