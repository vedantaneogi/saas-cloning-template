import { test as base, expect } from '@playwright/test'
import { apiFixture, type ApiClient } from './api'
import { authFixture, type SeedUser } from './auth'
import { dbFixture, type DbHelper } from './db'
import { namespaceFixture, type Namespace } from './namespace'

export type Fixtures = {
  api: ApiClient
  db: DbHelper
  ns: Namespace
  authedAs: (user: SeedUser) => Promise<void>
}

export const test = base.extend<Fixtures>({
  ...namespaceFixture,
  ...apiFixture,
  ...dbFixture,
  ...authFixture,
})

export { expect }
export type { SeedUser, Namespace, ApiClient, DbHelper }
