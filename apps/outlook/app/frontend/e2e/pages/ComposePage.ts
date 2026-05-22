import type { Page } from '@playwright/test'

/**
 * The compose pane is mounted inline inside ReadingPane on /mail/* surfaces
 * (composerOpen state) and as a floating modal elsewhere. Both shapes share
 * the same field shape — this POM works against either.
 */
export class ComposePage {
  constructor(private readonly page: Page) {}

  to() {
    return this.page.getByLabel('To').first()
  }

  cc() {
    return this.page.getByLabel('Cc').first()
  }

  subject() {
    return this.page.getByLabel('Subject').first()
  }

  body() {
    return this.page.locator('.ProseMirror').first()
  }

  send() {
    return this.page.getByRole('button', { name: /^Send$/ }).first()
  }

  discard() {
    return this.page.getByLabel('Discard message').first()
  }

  async fill({
    to,
    cc,
    subject,
    body,
  }: {
    to?: string[]
    cc?: string[]
    subject?: string
    body?: string
  }) {
    if (to) {
      for (const addr of to) {
        await this.to().fill(addr)
        await this.to().press('Enter')
      }
    }
    if (cc) {
      for (const addr of cc) {
        await this.cc().fill(addr)
        await this.cc().press('Enter')
      }
    }
    if (subject) await this.subject().fill(subject)
    if (body) await this.body().fill(body)
  }
}
