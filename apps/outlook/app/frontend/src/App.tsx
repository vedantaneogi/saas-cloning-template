import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Login } from './pages/Login'
import { SignUp } from './pages/SignUp'
import { Mail } from './pages/Mail'
import { MailSearch } from './pages/MailSearch'
import { Calendar } from './pages/Calendar'
import { Contacts } from './pages/Contacts'
import { Tasks } from './pages/Tasks'
import { Groups } from './pages/Groups'
import { Settings } from './pages/Settings'
import { PublicCalendar } from './pages/PublicCalendar'

/**
 * Outlook clone — Vite + React Router entry point.
 *
 * Routes mirror the legacy Next.js App Router structure 1:1:
 *
 *   /                        → /mail/inbox  (default)
 *   /sign-in                 → Login
 *   /sign-up                 → SignUp
 *   /mail/:folder            → Mail surface (inbox / drafts / sent / etc.)
 *   /mail/search             → Search results
 *   /calendar                → Calendar (month default)
 *   /calendar/:view          → Calendar (day / week / month / agenda)
 *   /contacts                → Contacts (People)
 *   /tasks                   → To Do
 *   /groups                  → Groups
 *   /settings                → Settings (general default)
 *   /settings/:section       → Settings (mail / calendar / signatures / rules / categories / oof / quick-steps)
 *   /calendar/public/:token  → Public read-only calendar (no auth)
 */
export default function App() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/sign-in" element={<Login />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/calendar/public/:token" element={<PublicCalendar />} />

      {/* Authenticated routes — share AppShell (top bar + sidebar + ribbon) */}
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/mail/inbox" replace />} />
        <Route path="/mail/search" element={<MailSearch />} />
        <Route path="/mail/:folder" element={<Mail />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/calendar/:view" element={<Calendar />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/:section" element={<Settings />} />
        <Route path="*" element={<Navigate to="/mail/inbox" replace />} />
      </Route>
    </Routes>
  )
}
