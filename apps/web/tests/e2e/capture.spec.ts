import { test } from '@playwright/test'

const BASE = 'http://localhost:3000'

const shots = [
  { name: 'mail-inbox', url: `/mail/inbox` },
  { name: 'mail-sent', url: `/mail/sent` },
  { name: 'mail-drafts', url: `/mail/drafts` },
  { name: 'calendar-month', url: `/calendar` },
  { name: 'calendar-week', url: `/calendar/week` },
  { name: 'calendar-day', url: `/calendar/day` },
  { name: 'contacts-list', url: `/contacts` },
  { name: 'tasks-list', url: `/tasks` },
  { name: 'settings-general', url: `/settings/general` },
  { name: 'settings-signatures', url: `/settings/signatures` },
  { name: 'settings-rules', url: `/settings/rules` },
  { name: 'settings-oof', url: `/settings/oof` },
]

for (const shot of shots) {
  test(`capture-${shot.name}`, async ({ page }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/sign-in`)
    await page.fill('[name="email"]', 'frank.miller@acmecorp.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('[type="submit"]')
    await page.waitForURL(`${BASE}/mail/inbox`)
    await page.goto(`${BASE}${shot.url}`)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `clone-screenshots/${shot.name}.png`, animations: 'disabled' })
  })
}
