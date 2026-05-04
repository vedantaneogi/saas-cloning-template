#!/usr/bin/env node
/**
 * E2B deployment script — no Docker, runs processes directly
 * Installs deps, starts postgres via apt, runs api + web, seeds db.
 */

import { Sandbox } from 'e2b'

const REPO_URL = 'https://github.com/vedantaneogi/saas-cloning-template.git'
const BRANCH = process.env.DEPLOY_BRANCH ?? 'outlook-clone'
const SECRET_KEY = process.env.SECRET_KEY ?? 'e2b-deploy-secret-key'
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const APP_DIR = '/home/user/app'
const SANDBOX_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours

function log(msg) {
  console.log(`[e2b-deploy] ${msg}`)
}

async function run(sandbox, cmd, opts = {}) {
  log(`$ ${cmd}`)
  const result = await sandbox.commands.run(cmd, {
    timeoutMs: opts.timeoutMs ?? 60_000,
    ...opts,
  })
  if (result.exitCode !== 0) {
    console.error(`STDOUT: ${result.stdout?.slice(-2000)}`)
    console.error(`STDERR: ${result.stderr?.slice(-2000)}`)
    throw new Error(`Command failed (exit ${result.exitCode}): ${cmd}`)
  }
  if (result.stdout?.trim()) log(result.stdout.trim().slice(-300))
  return result
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function waitForUrl(sandbox, url, maxAttempts = 30, intervalMs = 3000) {
  for (let i = 0; i < maxAttempts; i++) {
    const check = await sandbox.commands.run(
      `curl -so /dev/null -w "%{http_code}" ${url}`,
      { timeoutMs: 30_000 }
    )
    const code = check.stdout.trim()
    log(`Health check ${i + 1}: HTTP ${code}`)
    if (['200', '301', '302', '307', '308'].includes(code)) return true
    await sleep(intervalMs)
  }
  throw new Error(`Service at ${url} did not become healthy`)
}

async function main() {
  const apiKey = process.env.E2B_API_KEY
  if (!apiKey) throw new Error('E2B_API_KEY environment variable is not set')

  // Kill all existing sandboxes before creating a new one
  log('Cleaning up old sandboxes...')
  try {
    const running = await Sandbox.list({ apiKey })
    if (running.length > 0) {
      log(`Found ${running.length} running sandbox(es), killing them...`)
      for (const info of running) {
        try {
          const old = await Sandbox.connect(info.sandboxId, { apiKey })
          await old.kill()
          log(`Killed sandbox ${info.sandboxId}`)
        } catch (e) {
          log(`Could not kill ${info.sandboxId}: ${e.message}`)
        }
      }
    } else {
      log('No existing sandboxes found')
    }
  } catch (e) {
    log(`Sandbox cleanup skipped: ${e.message}`)
  }

  log('Creating E2B sandbox...')
  const sandbox = await Sandbox.create({
    apiKey,
    timeoutMs: SANDBOX_TIMEOUT,
    requestTimeoutMs: 30_000,
  })
  log(`Sandbox ID: ${sandbox.sandboxId}`)

  // Clone repo
  log(`Cloning ${REPO_URL} (branch: ${BRANCH})...`)
  await run(sandbox, `git clone --branch ${BRANCH} --depth 1 ${REPO_URL} ${APP_DIR}`, { timeoutMs: 60_000 })

  // ── PostgreSQL ────────────────────────────────────────────────
  log('Installing PostgreSQL...')
  await run(sandbox, 'sudo apt-get update -qq && sudo apt-get install -y postgresql postgresql-contrib', { timeoutMs: 120_000 })
  await run(sandbox, 'sudo service postgresql start')
  await run(sandbox, `sudo -u postgres psql -c "CREATE USER app WITH PASSWORD 'app';"`)
  await run(sandbox, `sudo -u postgres psql -c "CREATE DATABASE outlook OWNER app;"`)
  log('PostgreSQL ready')

  // ── Python / API ─────────────────────────────────────────────
  log('Installing system deps for asyncpg...')
  await run(sandbox, 'sudo apt-get install -y libpq-dev gcc python3-dev', { timeoutMs: 60_000 })

  log('Installing Python deps...')
  await run(sandbox,
    'pip install fastapi "uvicorn[standard]" "sqlalchemy[asyncio]" asyncpg alembic "pydantic[email]" pydantic-settings "python-jose[cryptography]" "passlib[bcrypt]" python-multipart aiofiles greenlet python-json-logger resend',
    { timeoutMs: 180_000 }
  )

  log('Running DB migrations...')
  await run(sandbox,
    `cd ${APP_DIR}/apps/api && DATABASE_URL=postgresql+asyncpg://app:app@localhost:5432/outlook alembic upgrade head`,
    { timeoutMs: 60_000 }
  )

  log('Starting API server...')
  sandbox.commands.run(
    `cd ${APP_DIR}/apps/api && DATABASE_URL=postgresql+asyncpg://app:app@localhost:5432/outlook SECRET_KEY=${SECRET_KEY} RESEND_API_KEY=${RESEND_API_KEY} RESEND_FROM_DOMAIN=resend.dev DEBUG=false python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/api.log 2>&1`,
    { timeoutMs: 0 }
  ).catch(() => {})

  await sleep(5000)
  // Check if it started at all
  const apiLog = await sandbox.commands.run('cat /tmp/api.log 2>/dev/null || echo "no log"', { timeoutMs: 0 })
  log(`API log:\n${apiLog.stdout}`)

  await waitForUrl(sandbox, 'http://localhost:8000/health')
  log('API is healthy!')

  // ── Node / Web ────────────────────────────────────────────────
  log('Installing Node.js 22...')
  await run(sandbox,
    'curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -',
    { timeoutMs: 60_000 }
  )
  await run(sandbox, 'sudo apt-get install -y nodejs', { timeoutMs: 120_000 })
  await run(sandbox, 'node --version && npm --version')

  // Add swap to ensure enough virtual memory for npm install of Next.js
  log('Adding swap space (2GB)...')
  await run(sandbox, 'sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile', { timeoutMs: 60_000 })
  await run(sandbox, 'free -h')

  // Install in a clean dir outside the monorepo to avoid packageManager field interference
  // PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 prevents ~300MB browser binary downloads
  log('Installing Node deps (all deps, skip playwright browsers)...')
  await run(sandbox, `mkdir -p /home/user/webapp-install && cp ${APP_DIR}/apps/web/package.json /home/user/webapp-install/`)
  await run(sandbox,
    'cd /home/user/webapp-install && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --legacy-peer-deps',
    { timeoutMs: 0 }
  )
  await run(sandbox, `cp -r /home/user/webapp-install/node_modules ${APP_DIR}/apps/web/`, { timeoutMs: 120_000 })

  const nextBin = `${APP_DIR}/apps/web/node_modules/.bin/next`
  log(`next binary: ${nextBin}`)

  log('Building Next.js...')
  await run(sandbox,
    `cd ${APP_DIR}/apps/web && NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_API_URL=/api/v1 NODE_OPTIONS="--max-old-space-size=1536" node ${nextBin} build`,
    { timeoutMs: 0 }
  )

  log('Starting web server...')
  sandbox.commands.run(
    `cd ${APP_DIR}/apps/web && API_INTERNAL_URL=http://localhost:8000 NODE_ENV=production node ${nextBin} start -p 3000 > /tmp/web.log 2>&1`,
    { timeoutMs: 0 }
  ).catch(() => {})

  await sleep(8000)
  const webLog = await sandbox.commands.run('cat /tmp/web.log 2>/dev/null || echo "no log"', { timeoutMs: 30_000 })
  log(`Web log:\n${webLog.stdout}`)

  await waitForUrl(sandbox, 'http://localhost:3000')
  log('Web server is ready!')

  // ── Seed ──────────────────────────────────────────────────────
  log('Seeding database...')
  const seed = await sandbox.commands.run(
    `curl -s -X POST http://localhost:8000/seed -H "Content-Type: application/json" -d @${APP_DIR}/apps/api/seeds/seed-default.json`,
    { timeoutMs: 0 }
  )
  log(`Seed: ${seed.stdout.slice(0, 150)}`)

  // ── Create threaded conversations for demo ────────────────────
  log('Creating threaded conversations...')
  try {
    await run(sandbox, `pip install requests`, { timeoutMs: 30_000 })
    await run(sandbox, `cd ${APP_DIR} && python3 scripts/deploy/create-threads.py`, { timeoutMs: 60_000 })
  } catch (e) {
    log(`Thread creation skipped: ${e.message?.slice(0, 100)}`)
  }

  // ── Public URLs ───────────────────────────────────────────────
  const webHost = sandbox.getHost(3000)
  const url = `https://${webHost}`

  log('='.repeat(60))
  log(`Deployment successful!`)
  log(`Public URL:  ${url}`)
  log(`Login:       frank.miller@acmecorp.com / password123`)
  log(`Sandbox ID:  ${sandbox.sandboxId}`)
  log('='.repeat(60))

  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import('fs')
    appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\n`)
    appendFileSync(process.env.GITHUB_OUTPUT, `sandbox_id=${sandbox.sandboxId}\n`)
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import('fs')
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `## Deployment Summary\n\n` +
      `| | |\n|---|---|\n` +
      `| **URL** | [${url}](${url}) |\n` +
      `| **Sandbox ID** | \`${sandbox.sandboxId}\` |\n` +
      `| **Branch** | \`${BRANCH}\` |\n` +
      `| **Login** | \`frank.miller@acmecorp.com\` / \`password123\` |\n`
    )
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
