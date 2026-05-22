import { Link, useLocation } from 'react-router-dom'

/**
 * Outlook clone — Mail surface (Phase 1 scaffold).
 *
 * The real Mail UI (folder tree + message list + reading pane + ribbon)
 * lives in `apps/web/src/components/mail/*` today. Phase 3 ports the
 * full component tree into `src/components/` and wires it through here.
 *
 * For now this page renders a placeholder card pointing at the live
 * Next.js surface so reviewers running `task outlook:dev-frontend`
 * see something meaningful before the migration completes.
 */
export function Mail() {
  const location = useLocation()
  const folder = location.pathname.split('/mail/')[1] || 'inbox'

  return (
    <div data-testid="mail-page" className="min-h-screen flex flex-col bg-[var(--content-bg)]">
      <header className="h-[var(--topbar-height)] bg-[var(--topbar-bg)] text-[var(--topbar-fg)] flex items-center px-4 text-sm font-semibold">
        Outlook
      </header>
      <main className="flex-1 p-8 bg-[var(--canvas-subtle)]">
        <div className="max-w-3xl mx-auto bg-[var(--content-bg)] border border-[var(--border-default)] rounded-md p-6 space-y-4">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Mail · {folder}</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Vite migration in progress (Phase 3). The full inbox, reading pane,
            compose, calendar, contacts, tasks, groups, search, and settings
            surfaces will land here as each is ported from
            <code className="mx-1 px-1 py-0.5 bg-[var(--canvas-subtle)] rounded text-xs">apps/web/src/</code>.
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Until then, the legacy Next.js stack continues to serve every
            production-grade feature. See{' '}
            <Link to="/sign-in" className="text-[var(--accent-link)] hover:underline">
              /sign-in
            </Link>{' '}
            to log in (or hop over to the deployed sandbox).
          </p>
        </div>
      </main>
    </div>
  )
}
