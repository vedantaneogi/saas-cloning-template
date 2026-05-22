import { test, expect } from '../fixtures/test'
import { ContactsPage } from '../pages/ContactsPage'
import { TasksPage } from '../pages/TasksPage'
import { GroupsPage } from '../pages/GroupsPage'
import { SearchPage } from '../pages/SearchPage'
import { SettingsPage } from '../pages/SettingsPage'

test.describe('smoke — every surface renders', () => {
  test('contacts renders', async ({ page }) => {
    await new ContactsPage(page).goto()
    await expect(page.getByTestId('contacts-page')).toBeVisible()
  })

  test('tasks renders', async ({ page }) => {
    await new TasksPage(page).goto()
    await expect(page.getByTestId('tasks-page')).toBeVisible()
  })

  test('groups renders', async ({ page }) => {
    await new GroupsPage(page).goto()
    await expect(page.getByTestId('groups-page')).toBeVisible()
  })

  test('search renders', async ({ page }) => {
    await new SearchPage(page).goto()
    await expect(page.getByTestId('search-page')).toBeVisible()
  })

  test('settings renders', async ({ page }) => {
    await new SettingsPage(page).goto()
    await expect(page.getByTestId('settings-page')).toBeVisible()
  })
})

test.describe('tool registry — backend smoke via the api fixture', () => {
  test('GET /tools returns the registry', async ({ api }) => {
    const ok = await api.health()
    expect(ok).toBeTruthy()
    const res = await api.tools()
    expect(Array.isArray(res.tools)).toBe(true)
    expect(res.tools.length).toBeGreaterThanOrEqual(30)
  })

  test('POST /step rejects unknown tool', async ({ api }) => {
    await expect(api.step('totally_not_a_tool', {})).rejects.toBeTruthy()
  })
})
