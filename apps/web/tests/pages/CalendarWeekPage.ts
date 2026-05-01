import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object — calendar-week
 * URL: https://outlook.office.com/calendar/view/Week
 * Components: SearchBar, CalendarGrid, ContactList, CalendarView
 */
export class CalendarWeekPage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('https://outlook.office.com/calendar/view/Week');
    await this.page.waitForLoadState('networkidle');
  }

  // --- Locators ---
  get skipToMainContent() { return this.page.locator("[aria-label=\"Skip to main content\"]"); }
  get appLauncher() { return this.page.locator("[aria-label=\"App launcher\"]"); }
  get axiomGlobalTechnologies() { return this.page.locator("[aria-label=\"Axiom Global Technologies\"]"); }
  get outlook() { return this.page.locator("[aria-label=\"Go to Outlook\"]"); }
  get search() { return this.page.locator("[aria-label=\"Search\"]"); }
  get chat() { return this.page.locator("[aria-label=\"Chat\"]"); }
  get oneNoteFeed() { return this.page.locator("[aria-label=\"OneNote feed\"]"); }
  get myDay() { return this.page.locator("[aria-label=\"My Day\"]"); }
  get () { return this.page.locator("[aria-label=\"Notifications\"]"); }
  get () { return this.page.locator("[aria-label=\"Settings\"]"); }
  get tA() { return this.page.locator("[aria-label=\"Account manager for TechBrig Alerts\"]"); }
  get signIn() { return this.page.locator("[aria-label=\"Sign in\"]"); }
  get mail() { return this.page.locator("[aria-label=\"Mail\"]"); }
  get calendar() { return this.page.locator("[aria-label=\"Calendar\"]"); }
  get copilot() { return this.page.locator("[aria-label=\"Copilot\"]"); }
  get people() { return this.page.locator("[aria-label=\"People\"]"); }
  get toDo() { return this.page.locator("[aria-label=\"To Do\"]"); }
  get newsletters() { return this.page.locator("[aria-label=\"Newsletters\"]"); }
  get orgExplorer() { return this.page.locator("[aria-label=\"Org Explorer\"]"); }
  get oneDrive() { return this.page.locator("[aria-label=\"OneDrive\"]"); }

  // --- Actions ---
  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `research/validation/${name}.png` });
  }
}
