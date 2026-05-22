// Mirror playwright.config.ts's BASE_URL derivation so this client + the
// browser context hit the same origin.
const CLONE_DOMAIN = process.env.CLONE_DOMAIN ?? 'outlook.clone.test'
const CADDY_HOST_PORT = process.env.CADDY_HOST_PORT ?? '443'
const PORT_SUFFIX = CADDY_HOST_PORT === '443' ? '' : `:${CADDY_HOST_PORT}`
const BASE_URL = process.env.FRONTEND_URL ?? `https://${CLONE_DOMAIN}${PORT_SUFFIX}`

export type LoginResult = {
  access_token: string
  user: {
    id: string
    email: string
    display_name: string
    role: string
    avatar_url: string | null
  }
}

/**
 * Shape of the `observation` returned by `POST /step`.
 */
export type StepObservation<T = Record<string, unknown>> = {
  text?: string
  is_error?: boolean
  structured_content: T
  content?: Array<{ type: string; text: string }>
}

export class ApiClient {
  readonly baseUrl: string

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl
  }

  async health(): Promise<boolean> {
    try {
      const r = await fetch(`${this.baseUrl}/health`)
      return r.ok
    } catch {
      return false
    }
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const r = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!r.ok) {
      const body = await r.text()
      throw new Error(`login failed for ${email}: HTTP ${r.status} ${body}`)
    }
    return (await r.json()) as LoginResult
  }

  async reset(): Promise<void> {
    // §2-gated: /rl/reset requires the X-Reset-Token header matching the
    // server's RL_RESET_TOKEN env var. The token is set in
    // docker-compose.dev.yml; tests pick it up via the same env.
    const token = process.env.RL_RESET_TOKEN ?? ''
    const r = await fetch(`${this.baseUrl}/reset`, {
      method: 'POST',
      headers: { 'X-Reset-Token': token },
    })
    if (!r.ok) throw new Error(`POST /reset failed: HTTP ${r.status}`)
  }

  async step<T = Record<string, unknown>>(
    tool_name: string,
    parameters: Record<string, unknown> = {},
    authToken?: string,
  ): Promise<StepObservation<T>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    const r = await fetch(`${this.baseUrl}/step`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: { tool_name, parameters } }),
    })
    if (!r.ok) throw new Error(`POST /step ${tool_name} failed: HTTP ${r.status}`)
    const body = (await r.json()) as { observation: Partial<StepObservation<T>> }
    if (body.observation?.is_error) {
      throw new Error(`tool ${tool_name} returned error: ${body.observation.text ?? 'unknown'}`)
    }
    return {
      ...body.observation,
      structured_content: body.observation.structured_content ?? ({} as T),
    } as StepObservation<T>
  }

  async tools(): Promise<{ tools: unknown[] }> {
    const r = await fetch(`${this.baseUrl}/tools`)
    if (!r.ok) throw new Error(`GET /tools failed: HTTP ${r.status}`)
    return (await r.json()) as { tools: unknown[] }
  }
}

export const apiFixture = {
  api: async ({}: Record<string, never>, use: (api: ApiClient) => Promise<void>) => {
    await use(new ApiClient())
  },
}
