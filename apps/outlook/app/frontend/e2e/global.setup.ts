import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as setup, request } from '@playwright/test'
import { ApiClient } from './fixtures/api'
import {
  AUTH_DIR,
  SEED_USERS,
  SEED_USER_PASSWORDS,
  storageStatePath,
  type SeedUser,
} from './fixtures/auth'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Must match playwright.config.ts:BASE_URL — if these diverge, the session
// cookies we write here are scoped to the wrong origin and every test sees
// the logged-out /sign-in page.
const CLONE_DOMAIN = process.env.CLONE_DOMAIN ?? 'outlook.clone.test'
const CADDY_HOST_PORT = process.env.CADDY_HOST_PORT ?? '443'
const PORT_SUFFIX = CADDY_HOST_PORT === '443' ? '' : `:${CADDY_HOST_PORT}`
const BASE_URL = process.env.FRONTEND_URL ?? `https://${CLONE_DOMAIN}${PORT_SUFFIX}`

setup('stack is reachable', async () => {
  const api = new ApiClient(BASE_URL)
  const ok = await api.health()
  if (!ok) {
    throw new Error(
      `Outlook clone stack is not reachable at ${BASE_URL}.\n\n` +
        `Run the stack first:\n` +
        `  task outlook:up\n` +
        `  task outlook:seed\n\n` +
        `Then re-run the e2e suite.`,
    )
  }
})

setup('pre-generate storage state for seed users', async () => {
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  const gitignore = path.join(AUTH_DIR, '.gitignore')
  if (!fs.existsSync(gitignore)) {
    fs.writeFileSync(gitignore, '*\n!.gitignore\n')
  }

  for (const user of SEED_USERS) {
    const ctx = await request.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true })
    const res = await ctx.post('/api/v1/auth/login', {
      data: { email: user, password: SEED_USER_PASSWORDS[user as SeedUser] },
    })
    if (!res.ok()) {
      const body = await res.text()
      await ctx.dispose()
      throw new Error(
        `Failed to log in seed user "${user}": HTTP ${res.status()} ${body}\n` +
          `Confirm \`task outlook:seed\` was run after the last \`task outlook:up\`.`,
      )
    }
    await ctx.storageState({ path: storageStatePath(user) })
    await ctx.dispose()
  }
})
