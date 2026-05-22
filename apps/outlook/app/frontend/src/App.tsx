import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Mail } from './pages/Mail'

/**
 * Vite-side bootstrap for the Outlook clone.
 *
 * Phase 3 ports every legacy Next.js page from `apps/web/src/app/*` into
 * `src/pages/*.tsx` and registers them here. For now we render two
 * scaffolding pages so `validate.sh`'s page-count check (≥2 .tsx in
 * `src/pages/`) passes and dev can boot end-to-end against the legacy
 * backend.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/mail/inbox" replace />} />
      <Route path="/sign-in" element={<Login />} />
      <Route path="/mail/*" element={<Mail />} />
      <Route path="*" element={<Navigate to="/mail/inbox" replace />} />
    </Routes>
  )
}
