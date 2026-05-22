import type { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class TasksPage extends BasePage {
  readonly url = '/tasks'
  readonly pageTestId = 'tasks-page'

  constructor(page: Page) {
    super(page)
  }

  newTaskInput() {
    return this.page.getByPlaceholder(/Add a task/i)
  }

  taskRow(title: string) {
    return this.page.getByText(title).first()
  }
}
