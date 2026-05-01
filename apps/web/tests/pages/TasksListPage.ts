import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object — tasks-list
 * URL: https://outlook.office.com/tasks
 * Components: SearchBar, TasksView
 */
export class TasksListPage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('https://outlook.office.com/tasks');
    await this.page.waitForLoadState('networkidle');
  }

  // --- Locators ---
  get noThanks() { return this.page.locator("[aria-label=\"No thanks\"]"); }
  get tryEdge() { return this.page.locator("[aria-label=\"Try Edge\"]"); }
  get allMicrosoftExpandTo() { return this.page.locator("[aria-label=\"All Microsoft expand to see list of Microsoft products and services\"]"); }
  get closeSearch() { return this.page.locator("[aria-label=\"Close search\"]"); }
  get microsoft() { return this.page.locator("[aria-label=\"Microsoft\"]"); }
  get seeMoreMenuOptions() { return this.page.locator("[aria-label=\"See more menu options\"]"); }
  get more() { return this.page.locator("[aria-label=\"More\"]"); }
  get searchExpanded() { return this.page.locator("[aria-label=\"Search Expanded\"]"); }
  get search() { return this.page.locator("[aria-label=\"Search or ask a question\"]"); }
  get cancel() { return this.page.locator("[aria-label=\"Cancel Search\"]"); }
  get cart() { return this.page.locator("[aria-label=\"0 items in shopping cart\"]"); }
  get signInToYour() { return this.page.locator("[aria-label=\"Sign in to your account\"]"); }
  get downloadForAndroid() { return this.page.locator("[aria-label=\"Download  for Android\"]"); }
  get downloadForWindows() { return this.page.locator("[aria-label=\"Download  for Windows\"]"); }
  get downloadForIOS() { return this.page.locator("[aria-label=\"Download  for iOS\"]"); }
  get surfacePro() { return this.page.locator("[aria-label=\"Surface Pro What's new\"]"); }
  get surfaceLaptop() { return this.page.locator("[aria-label=\"Surface Laptop What's new\"]"); }
  get surfaceLaptopStudio2() { return this.page.locator("[aria-label=\"Surface Laptop Studio 2 What's new\"]"); }
  get copilotForOrganizations() { return this.page.locator("[aria-label=\"Copilot for organizations What's new\"]"); }

  // --- Actions ---
  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `research/validation/${name}.png` });
  }
}
