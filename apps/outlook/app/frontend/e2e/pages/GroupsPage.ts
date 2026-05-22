import type { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class GroupsPage extends BasePage {
  readonly url = '/groups'
  readonly pageTestId = 'groups-page'

  constructor(page: Page) {
    super(page)
  }

  groupRow(name: string) {
    return this.page.getByText(name).first()
  }
}
