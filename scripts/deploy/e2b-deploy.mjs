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
const SANDBOX_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours (E2B max)

function log(msg) {
  console.log(`[e2b-deploy] ${msg}`)
}

async function run(sandbox, cmd, opts = {}) {
  log(`$ ${cmd}`)
  const result = await sandbox.commands.run(cmd, {
    timeoutMs: opts.timeoutMs ?? 120_000,
    ...opts,
  })
  if (result.exitCode !== 0) {
    console.error(`STDOUT: ${result.stdout}`)
    console.error(`STDERR: ${result.stderr}`)
    throw new Error(`Command failed (exit ${result.exitCode}): ${cmd}`)
  }
  if (result.stdout.trim()) log(result.stdout.trim())
  return result
}

async function main() {
  log('Creating E2B sandbox...')
  const sandbox = await Sandbox.create({
    timeoutMs: SANDBOX_TIMEOUT,
  })

  log(`Sandbox ID: ${sandbox.sandboxId}`)

  // Install Docker
  log('Installing Docker...')
  await run(sandbox, 'curl -fsSL https://get.docker.com | sh', { timeoutMs: 180_000 })
  await run(sandbox, 'docker --version')

  // Install docker-compose plugin
  await run(sandbox,
    'apt-get install -y docker-compose-plugin 2>/dev/null || pip install docker-compose',
    { timeoutMs: 60_000 }
  )

  // Clone repo
  log(`Cloning ${REPO_URL} (branch: ${BRANCH})...`)
  await run(sandbox, `git clone --branch ${BRANCH} --depth 1 ${REPO_URL} /app`, { timeoutMs: 60_000 })

  // Start the stack
  log('Building and starting services (this takes ~5 mins for first build)...')
  await run(sandbox,
    `cd /app && SECRET_KEY=${SECRET_KEY} docker compose -f docker-compose.prod.yml up -d --build`,
    { timeoutMs: 600_000 }
  )

  // Wait for services to be healthy
  log('Waiting for services to be ready...')
  await run(sandbox,
    'cd /app && docker compose -f docker-compose.prod.yml ps',
    { timeoutMs: 30_000 }
  )

  // Seed the database
  log('Seeding database...')
  await new Promise(r => setTimeout(r, 5000)) // give API a moment to finish migrations
  await run(sandbox,
    `curl -s -X POST http://localhost/seed -H "Content-Type: application/json" -d @/app/apps/api/seeds/seed-default.json`,
    { timeoutMs: 30_000 }
  )

  // Get public URL (nginx is on port 80)
  const host = sandbox.getHost(80)
  const url = `https://${host}`

  log('='.repeat(60))
  log(`Deployment successful!`)
  log(`Public URL: ${url}`)
  log(`Sandbox ID: ${sandbox.sandboxId}`)
  log('='.repeat(60))

  // Write outputs for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import('fs')
    appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\n`)
    appendFileSync(process.env.GITHUB_OUTPUT, `sandbox_id=${sandbox.sandboxId}\n`)
  }

  // Print summary for GitHub Actions job summary
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
