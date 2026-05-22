import type { TestInfo } from '@playwright/test'

export type Namespace = {
  prefix: string
  name: (kind: string) => string
}

/**
 * Per-spec unique prefix — prevents parallel / repeated-run collisions
 * when specs create labelled entities (folders, contacts, tasks, etc.).
 * Mirrors apps/github/app/frontend/e2e/fixtures/namespace.ts.
 */
export const namespaceFixture = {
  ns: async (
    {}: Record<string, never>,
    use: (ns: Namespace) => Promise<void>,
    testInfo: TestInfo,
  ) => {
    const safeTitle = testInfo.titlePath
      .join('-')
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
      .slice(0, 40)
    const prefix = `e2e-w${testInfo.workerIndex}-${safeTitle}-${Date.now().toString(36)}`
    await use({
      prefix,
      name: (kind: string) => `${prefix}-${kind}`,
    })
  },
}
