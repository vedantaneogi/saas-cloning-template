import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Outlook clone — sign-in page (Phase 1 scaffold).
 *
 * Real port from `apps/web/src/app/sign-in/page.tsx` lands in Phase 3.
 * For now this is a working two-field login that hits the legacy FastAPI
 * `/api/v1/auth/login` endpoint and stores the access token in
 * localStorage matching the existing auth store shape.
 */
export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('frank.miller@acmecorp.com')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Login failed: HTTP ${res.status} — ${body}`)
      }
      const data = (await res.json()) as { access_token: string; user: unknown }
      localStorage.setItem(
        'outlook_auth',
        JSON.stringify({ token: data.access_token, currentUser: data.user, accounts: [] }),
      )
      navigate('/mail/inbox', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <div data-testid="login-page" className="min-h-screen flex items-center justify-center bg-[var(--canvas-subtle)] p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[var(--content-bg)] border border-[var(--border-default)] rounded-md shadow-outlook p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Sign in to Outlook</h1>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Email</span>
          <input
            data-testid="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full border border-[var(--border-strong)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Password</span>
          <input
            data-testid="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full border border-[var(--border-strong)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
          />
        </label>
        {error && (
          <p data-testid="login-error" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        <button
          data-testid="login-submit"
          type="submit"
          disabled={pending}
          className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
