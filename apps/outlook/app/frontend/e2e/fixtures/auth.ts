import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BrowserContext } from '@playwright/test'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const AUTH_DIR = path.resolve(__dirname, '..', '.auth')

// Outlook seed users — all share `password123` per seed-default.json.
// Frank is the canonical demo mailbox (Project Alpha thread, calendar,
// contacts, attachments, rules). Other workers have their own folder
// trees + delivery-side conversations via the create-threads.py post-seed.
export const SEED_USERS = [
  'frank.miller@acmecorp.com',
  'alice.johnson@acmecorp.com',
  'bob.smith@acmecorp.com',
  'david.brown@acmecorp.com',
] as const

export type SeedUser = (typeof SEED_USERS)[number]

export const SEED_USER_PASSWORDS: Record<SeedUser, string> = {
  'frank.miller@acmecorp.com': 'password123',
  'alice.johnson@acmecorp.com': 'password123',
  'bob.smith@acmecorp.com': 'password123',
  'david.brown@acmecorp.com': 'password123',
}

/**
 * Storage state filename is the local-part of the email (before @) so
 * paths stay POSIX-safe — `frank.miller.json`, `alice.johnson.json`, …
 */
export function storageStatePath(user: SeedUser): string {
  const local = user.split('@')[0]
  return path.join(AUTH_DIR, `${local}.json`)
}

type SavedCookie = {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

type SavedStorageState = {
  cookies: SavedCookie[]
  origins?: unknown[]
}

export const authFixture = {
  authedAs: async (
    { context }: { context: BrowserContext },
    use: (fn: (user: SeedUser) => Promise<void>) => Promise<void>,
  ) => {
    const switchUser = async (user: SeedUser): Promise<void> => {
      const file = storageStatePath(user)
      if (!fs.existsSync(file)) {
        throw new Error(
          `Missing storage state for user "${user}" at ${file}. ` +
            `Did global.setup.ts run? Confirm the stack is up: ` +
            `\`task outlook:up && task outlook:seed\`.`,
        )
      }
      const state = JSON.parse(fs.readFileSync(file, 'utf-8')) as SavedStorageState
      await context.clearCookies()
      if (state.cookies?.length) {
        await context.addCookies(state.cookies)
      }
    }
    await use(switchUser)
  },
}
