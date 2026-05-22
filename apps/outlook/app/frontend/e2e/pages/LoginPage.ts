import { expect, type Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class LoginPage extends BasePage {
  readonly url = '/sign-in'
  readonly pageTestId = 'login-page'

  constructor(page: Page) {
    super(page)
  }

  email() {
    return this.page.getByTestId('login-email')
  }

  password() {
    return this.page.getByTestId('login-password')
  }

  submit() {
    return this.page.getByTestId('login-submit')
  }

  error() {
    return this.page.getByTestId('login-error')
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.email().fill(email)
    await this.password().fill(password)
    await this.submit().click()
  }

  async expectError(): Promise<void> {
    await expect(this.error()).toBeVisible()
  }
}
