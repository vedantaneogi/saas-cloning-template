import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object — contacts-list
 * URL: https://outlook.office.com/people
 * Components: SearchBar, CalendarGrid, ContactList, ContactsView
 */
export class ContactsListPage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('https://outlook.office.com/people');
    await this.page.waitForLoadState('networkidle');
  }

  // --- Locators ---
  get appLauncher() { return this.page.locator("[aria-label=\"App launcher\"]"); }
  get axiomGlobalTechnologies() { return this.page.locator("[aria-label=\"Axiom Global Technologies\"]"); }
  get outlook() { return this.page.locator("[aria-label=\"Go to Outlook\"]"); }
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
  get () { return this.page.locator("[aria-label=\"Hide navigation pane\"]"); }
  get newContactCreateA() { return this.page.locator("[aria-label=\"New contact\"]"); }

  // --- Actions ---
  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `research/validation/${name}.png` });
  }
}
