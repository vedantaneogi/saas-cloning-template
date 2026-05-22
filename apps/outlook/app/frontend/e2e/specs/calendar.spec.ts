import { test, expect } from '../fixtures/test'
import { CalendarPage } from '../pages/CalendarPage'

test.describe('calendar', () => {
  test('month view renders', async ({ page }) => {
    const cal = new CalendarPage(page, 'month')
    await cal.goto()
    await expect(page.getByTestId('calendar-page')).toBeVisible()
  })

  test('week view renders', async ({ page }) => {
    const cal = new CalendarPage(page, 'week')
    await cal.goto()
    await expect(page).toHaveURL(/\/calendar\/week$/)
  })

  test('day view renders', async ({ page }) => {
    const cal = new CalendarPage(page, 'day')
    await cal.goto()
    await expect(page).toHaveURL(/\/calendar\/day$/)
  })
})
