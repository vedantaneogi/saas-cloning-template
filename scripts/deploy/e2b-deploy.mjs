#!/usr/bin/env node
/**
 * E2B deployment script
 * Creates an E2B sandbox, installs Docker, clones the repo,
 * and runs docker-compose.prod.yml. Outputs the public URL.
 */

import { Sandbox } from 'e2b'

const REPO_URL = 'https://github.com/vedantaneogi/saas-cloning-template.git'
const BRANCH = process.env.DEPLOY_BRANCH ?? 'outlook-clone'
const SECRET_KEY = process.env.SECRET_KEY ?? 'e2b-deploy-secret-key'
const APP_DIR = '/home/user/app'
const SANDBOX_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours (E2B max)

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
  if (result.stdout?.trim()) log(result.stdout.trim().slice(-500))
  return result
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  const apiKey = process.env.E2B_API_KEY
  if (!apiKey) throw new Error('E2B_API_KEY environment variable is not set')

  log('Creating E2B sandbox...')
  const sandbox = await Sandbox.create({
    apiKey,
    timeoutMs: SANDBOX_TIMEOUT,
    requestTimeoutMs: 30_000,
  })

  log(`Sandbox ID: ${sandbox.sandboxId}`)

  // Install Docker
  log('Installing Docker...')
  await run(sandbox, 'curl -fsSL https://get.docker.com | sudo sh', { timeoutMs: 180_000 })
  await run(sandbox, 'sudo docker --version')
  await run(sandbox, 'sudo docker compose version')

  // Clone repo
  log(`Cloning ${REPO_URL} (branch: ${BRANCH})...`)
  await run(sandbox, `git clone --branch ${BRANCH} --depth 1 ${REPO_URL} ${APP_DIR}`, { timeoutMs: 60_000 })

  // Build images sequentially (avoids OOM from parallel builds in E2B sandbox)
  log('Building API image...')
  await run(sandbox,
    `cd ${APP_DIR} && sudo docker compose -f docker-compose.prod.yml build api 2>&1`,
    { timeoutMs: 0 }
  )

  log('Building web image...')
  await run(sandbox,
    `cd ${APP_DIR} && sudo docker compose -f docker-compose.prod.yml build web 2>&1`,
    { timeoutMs: 0 }
  )

  log('Starting all services...')
  await run(sandbox,
    `cd ${APP_DIR} && SECRET_KEY=${SECRET_KEY} sudo docker compose -f docker-compose.prod.yml up -d 2>&1`,
    { timeoutMs: 60_000 }
  )

  // Show running containers
  log('Services are up! Running containers:')
  await run(sandbox, `sudo docker compose -f ${APP_DIR}/docker-compose.prod.yml ps 2>&1`)

  // Wait for API health check
  log('Waiting for API to be ready...')
  for (let i = 0; i < 30; i++) {
    await sleep(3_000)
    const check = await sandbox.commands.run('curl -sf http://localhost/health && echo OK || echo WAITING', { timeoutMs: 0 })
    if (check.stdout.trim() === 'OK') {
      log('API is healthy!')
      break
    }
    log(`Health check ${i + 1}/30: waiting...`)
  }

  // Seed database
  log('Seeding database...')
  const seedResult = await sandbox.commands.run(
    `curl -s -X POST http://localhost/seed -H "Content-Type: application/json" -d @${APP_DIR}/apps/api/seeds/seed-default.json`
  )
  log(`Seed result: ${seedResult.stdout.slice(0, 200)}`)

  // Get public URL (nginx on port 80)
  const host = sandbox.getHost(80)
  const url = `https://${host}`

  log('='.repeat(60))
  log(`Deployment successful!`)
  log(`Public URL:  ${url}`)
  log(`Login:       frank.miller@acmecorp.com / password123`)
  log(`Sandbox ID:  ${sandbox.sandboxId}`)
  log('='.repeat(60))

  // GitHub Actions outputs
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
