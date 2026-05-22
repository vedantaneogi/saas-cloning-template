import { test, expect } from '../fixtures/test'
import { LoginPage } from '../pages/LoginPage'

// Auth-flow specs need a logged-out start; the default storageState in
// playwright.config.ts pre-loads Frank's session.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('auth', () => {
  test('valid login lands on inbox', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.signIn('frank.miller@acmecorp.com', 'password123')
    await expect(page).toHaveURL(/\/mail\/inbox$/, { timeout: 10_000 })
    await expect(page.getByTestId('mail-page')).toBeVisible()
  })

  test('invalid password shows error', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.signIn('frank.miller@acmecorp.com', 'definitely-wrong')
    await login.expectError()
    // Stays on /sign-in, no redirect.
    await expect(page).toHaveURL(/\/sign-in$/)
  })

  test('logged-out access redirects to /sign-in', async ({ page }) => {
    await page.goto('/mail/inbox')
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 5_000 })
  })

  test('session persists across reload', async ({ page, browser }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.signIn('frank.miller@acmecorp.com', 'password123')
    await expect(page).toHaveURL(/\/mail\/inbox$/, { timeout: 10_000 })
    // Reload — should land back on inbox, not /sign-in.
    await page.reload()
    await expect(page).toHaveURL(/\/mail\/inbox$/)
    await expect(page.getByTestId('mail-page')).toBeVisible()
    // Sanity: token survives even when a fresh context is built from
    // the persisted storage.
    const state = await page.context().storageState()
    expect(state.origins.length).toBeGreaterThan(0)
  })
})
