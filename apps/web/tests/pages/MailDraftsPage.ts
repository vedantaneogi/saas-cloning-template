import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object — mail-drafts
 * URL: https://outlook.office.com/mail/drafts
 * Components: SearchBar, ComposeButton, FolderTree, CalendarGrid, ContactList
 */
export class MailDraftsPage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('https://outlook.office.com/mail/drafts');
    await this.page.waitForLoadState('networkidle');
  }

  // --- Locators ---
  get skipToMainContent() { return this.page.locator("[aria-label=\"Skip to main content\"]"); }
  get appLauncher() { return this.page.locator("[aria-label=\"App launcher\"]"); }
  get axiomGlobalTechnologies() { return this.page.locator("[aria-label=\"Axiom Global Technologies\"]"); }
  get outlook() { return this.page.locator("[aria-label=\"Go to Outlook\"]"); }
  get searchForEmail() { return this.page.locator("[aria-label=\"Search for email, meetings, files and more.\"]"); }
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
  get () { return this.page.locator("[aria-label=\"More apps\"]"); }

  // --- Actions ---
  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `research/validation/${name}.png` });
  }
}
