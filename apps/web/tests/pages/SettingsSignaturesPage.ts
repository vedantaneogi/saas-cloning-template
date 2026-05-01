import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object — settings-signatures
 * URL: https://outlook.office.com/options/mail/emailsignature
 * Components: SettingsPanel
 */
export class SettingsSignaturesPage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('https://outlook.office.com/options/mail/emailsignature');
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
