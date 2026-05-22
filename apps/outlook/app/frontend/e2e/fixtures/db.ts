import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { request } from '@playwright/test'
import type { ApiClient } from './api'
import { SEED_USERS, SEED_USER_PASSWORDS, storageStatePath } from './auth'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REPO_ROOT = path.resolve(__dirname, '../../../../../..')
const BASE_URL = process.env.FRONTEND_URL ?? 'http://localhost:8045'

export class DbHelper {
  constructor(private readonly api: ApiClient) {}

  async reset(): Promise<void> {
    await this.api.reset()
  }

  reseed(): void {
    execSync('task outlook:seed', {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'inherit', 'inherit'],
    })
  }

  /**
   * `POST /rl/reset` wipes the sessions table along with everything else,
   * so every pre-generated storageState file points at a session token
   * that no longer exists. After a reseed, regenerate fresh storage state
   * for every seed user so subsequent specs have valid cookies. Without
   * this, tests that follow a reseed see redirects to /sign-in.
   */
  async regenerateStorageStates(): Promise<void> {
    for (const user of SEED_USERS) {
      const ctx = await request.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true })
      const res = await ctx.post('/api/v1/auth/login', {
        data: { email: user, password: SEED_USER_PASSWORDS[user] },
      })
      if (!res.ok()) {
        await ctx.dispose()
        throw new Error(
          `Re-login of seed user "${user}" failed after reseed: HTTP ${res.status()}.`,
        )
      }
      await ctx.storageState({ path: storageStatePath(user) })
      await ctx.dispose()
    }
  }

  async resetAndReseed(): Promise<void> {
    await this.reset()
    this.reseed()
    await this.regenerateStorageStates()
  }
}

export const dbFixture = {
  db: async ({ api }: { api: ApiClient }, use: (db: DbHelper) => Promise<void>) => {
    await use(new DbHelper(api))
  },
}
