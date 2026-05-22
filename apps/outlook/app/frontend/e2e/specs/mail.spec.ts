import { test, expect } from '../fixtures/test'
import { MailPage } from '../pages/MailPage'

test.describe('mail', () => {
  test('inbox loads', async ({ page }) => {
    const mail = new MailPage(page, 'inbox')
    await mail.goto()
    await expect(page.getByTestId('mail-page')).toBeVisible()
  })

  test('switches to sent folder', async ({ page }) => {
    const inbox = new MailPage(page, 'inbox')
    await inbox.goto()
    const sent = new MailPage(page, 'sent')
    await sent.goto()
    await expect(page).toHaveURL(/\/mail\/sent$/)
  })

  test('opens a seeded message in the reading pane', async ({ page }) => {
    const mail = new MailPage(page, 'inbox')
    await mail.goto()
    // Click the first row in the list (Frank has 60+ seeded inbox rows).
    await mail.firstMessage().click()
    // The reading pane should show *something* — header text proves
    // routing + state wiring is live.
    await expect(page.locator('[data-automation-id="MailReadCompose"]')).toBeVisible()
  })

  test('focused / other toggle works', async ({ page }) => {
    const mail = new MailPage(page, 'inbox')
    await mail.goto()
    await mail.otherTab().click()
    await expect(mail.otherTab()).toHaveAttribute('aria-selected', 'true')
    await mail.focusedTab().click()
    await expect(mail.focusedTab()).toHaveAttribute('aria-selected', 'true')
  })
})
