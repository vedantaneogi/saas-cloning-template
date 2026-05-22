import type { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class CalendarPage extends BasePage {
  readonly url: string
  readonly pageTestId = 'calendar-page'

  constructor(page: Page, view: 'day' | 'week' | 'month' | 'agenda' = 'month') {
    super(page)
    this.url = `/calendar/${view}`
  }

  newEventButton() {
    return this.page.getByRole('button', { name: /New event/i }).first()
  }

  eventCard(title: string) {
    return this.page.getByText(title).first()
  }
}
