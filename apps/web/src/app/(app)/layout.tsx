'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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

export default function AppLayout({ children }: { children: React.ReactNode }) {
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

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable
      const ctrl = e.ctrlKey || e.metaKey

      // Ctrl+N — new mail (not in input)
      if (ctrl && e.key === 'n' && !inInput) {
        e.preventDefault()
        openComposer()
        return
      }

      // Mail-only shortcuts
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

      // Escape — close composer
      if (e.key === 'Escape' && composerOpen) {
        closeComposer()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pathname, selectedMessageId, composerOpen, openComposer, closeComposer, setSelectedMessageId, queryClient])

  // After hydration, if no token, don't render (redirect is in progress)
  if (hydrated && !token) return null

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0F6CBD]">
      <TopToolbar />
      {/* Inset on all four sides — the parent `bg-[#0F6CBD]` shows through
          the gaps so the work surface clearly floats over the blue header
          (matches Outlook's detachment of the file/tab row + ribbon from
          the navigation strip). Top gap is the most important bit; without
          it the white was flush against the blue and the ribbon looked
          attached. */}
      <div className="flex flex-1 overflow-hidden mx-1.5 mt-1 mb-1.5 rounded-md bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <RibbonTabs />
          <main className="flex-1 overflow-hidden" role="main">
            {children}
          </main>
        </div>
      </div>

      {/* Compose is now inline in ReadingPane on /mail and inline in the
          group EmailTab on /groups — no popup modal on those pages. Other
          surfaces (calendar, contacts, tasks) still get the popup. */}
      {composerOpen
        && !pathname?.startsWith('/mail')
        && !pathname?.startsWith('/groups') && (
        <ComposeModal open={composerOpen} onClose={closeComposer} />
      )}

      {/* Settings Modal */}
      <SettingsModal />

      {/* Notification Toast */}
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
