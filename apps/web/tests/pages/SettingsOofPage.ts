import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object — settings-oof
 * URL: https://outlook.office.com/options/mail/automaticReplies
 * Components: SettingsPanel
 */
export class SettingsOofPage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('https://outlook.office.com/options/mail/automaticReplies');
    await this.page.waitForLoadState('networkidle');
  }

  // --- Locators ---
  // No locators extracted for this page

  // --- Actions ---
  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `research/validation/${name}.png` });
  }
}
