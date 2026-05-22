import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useRouter, usePathname } from '@/lib/next-compat'
import { useAuthStore } from '@/store/auth'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { TopToolbar } from '@/components/layout/TopToolbar'
import { RibbonTabs } from '@/components/layout/RibbonTabs'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { ComposeModal } from '@/components/mail/ComposeModal'
import { useUIStore, draftFromReply } from '@/store/ui'
import { useMailStore } from '@/store/mail'
import { messages } from '@/lib/api'
import type { Message } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'

/**
 * AppShell — the chrome that wraps every authenticated page.
 * Ported 1:1 from `apps/web/src/app/(app)/layout.tsx`. The child route's
 * content renders through React Router's `<Outlet />`.
 */
export function AppShell() {
  const router = useRouter()
  const pathname = usePathname()
  const token = useAuthStore((s) => s.token)
  const composerOpen = useUIStore((s) => s.composerOpen)
  const closeComposer = useUIStore((s) => s.closeComposer)
  const openComposer = useUIStore((s) => s.openComposer)
  const notificationMessage = useUIStore((s) => s.notificationMessage)
  const selectedMessageId = useMailStore((s) => s.selectedMessageId)
  const setSelectedMessageId = useMailStore((s) => s.setSelectedMessageId)
  const queryClient = useQueryClient()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && !token) {
      router.push('/sign-in')
    }
  }, [hydrated, token, router])

  // Global keyboard shortcuts (Ctrl+N new mail, reply/forward, delete, escape)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable
      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 'n' && !inInput) {
        e.preventDefault()
        openComposer()
        return
      }

      if (pathname?.startsWith('/mail') && selectedMessageId) {
        const msg = queryClient.getQueryData<Message>(['message', selectedMessageId])

        if (ctrl && !e.shiftKey && e.key === 'r' && !inInput) {
          e.preventDefault()
          if (msg) openComposer(draftFromReply(msg, 'reply'))
          return
        }
        if (ctrl && e.shiftKey && e.key === 'R' && !inInput) {
          e.preventDefault()
          if (msg) openComposer(draftFromReply(msg, 'reply_all'))
          return
        }
        if (ctrl && e.key === 'f' && !inInput) {
          e.preventDefault()
          if (msg) openComposer(draftFromReply(msg, 'forward'))
          return
        }
        if (e.key === 'Delete' && !inInput) {
          e.preventDefault()
          messages.delete(selectedMessageId).then(() => {
            queryClient.invalidateQueries({ queryKey: ['messages'] })
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            setSelectedMessageId(null)
          })
          return
        }
      }

      if (e.key === 'Escape' && composerOpen) {
        closeComposer()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pathname, selectedMessageId, composerOpen, openComposer, closeComposer, setSelectedMessageId, queryClient])

  if (hydrated && !token) return null

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0F6CBD]">
      <TopToolbar />
      <div className="flex flex-1 overflow-hidden mx-1 mb-1 rounded-t bg-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <RibbonTabs />
          <main className="flex-1 overflow-hidden" role="main">
            <Outlet />
          </main>
        </div>
      </div>

      {composerOpen
        && !pathname?.startsWith('/mail')
        && !pathname?.startsWith('/groups') && (
        <ComposeModal open={composerOpen} onClose={closeComposer} />
      )}

      <SettingsModal />

      {notificationMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#323130] text-white text-sm px-4 py-2 rounded shadow-outlook animate-fade-in"
        >
          {notificationMessage}
        </div>
      )}
    </div>
  )
}
