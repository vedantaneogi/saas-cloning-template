import { create } from 'zustand'
import type { Message } from '@/lib/api'

interface ComposerDraft {
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  bodyHtml: string
  replyToMessageId?: string
  forwardMessageId?: string
  replyType?: 'reply' | 'reply_all' | 'forward'
}

interface UIState {
  composerOpen: boolean
  composerDraft: ComposerDraft
  settingsOpen: boolean
  settingsSection: string
  sidebarWidth: number
  readingPaneWidth: number
  notificationMessage: string | null

  openComposer: (draft?: Partial<ComposerDraft>) => void
  closeComposer: () => void
  setComposerDraft: (draft: Partial<ComposerDraft>) => void
  openSettings: (section?: string) => void
  closeSettings: () => void
  setSidebarWidth: (width: number) => void
  setReadingPaneWidth: (width: number) => void
  showNotification: (message: string) => void
  clearNotification: () => void
}

const DEFAULT_DRAFT: ComposerDraft = {
  to: [],
  cc: [],
  bcc: [],
  subject: '',
  bodyHtml: '',
}

export const useUIStore = create<UIState>((set) => ({
  composerOpen: false,
  composerDraft: DEFAULT_DRAFT,
  settingsOpen: false,
  settingsSection: 'general',
  sidebarWidth: 240,
  readingPaneWidth: 500,
  notificationMessage: null,

  openComposer: (draft) =>
    set({
      composerOpen: true,
      composerDraft: { ...DEFAULT_DRAFT, ...draft },
    }),

  closeComposer: () =>
    set({ composerOpen: false, composerDraft: DEFAULT_DRAFT }),

  setComposerDraft: (draft) =>
    set((state) => ({
      composerDraft: { ...state.composerDraft, ...draft },
    })),

  openSettings: (section) => set({ settingsOpen: true, settingsSection: section ?? 'general' }),
  closeSettings: () => set({ settingsOpen: false }),

  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setReadingPaneWidth: (width) => set({ readingPaneWidth: width }),

  showNotification: (message) => {
    set({ notificationMessage: message })
    setTimeout(() => set({ notificationMessage: null }), 3000)
  },

  clearNotification: () => set({ notificationMessage: null }),
}))

export function draftFromReply(message: Message, type: 'reply' | 'reply_all' | 'forward'): Partial<ComposerDraft> {
  const subject =
    type === 'forward'
      ? `FW: ${message.subject}`
      : message.subject.startsWith('RE:')
      ? message.subject
      : `RE: ${message.subject}`

  const to =
    type === 'forward'
      ? []
      : [`${message.from_name ?? ''} <${message.from_address}>`]

  const cc =
    type === 'reply_all'
      ? message.cc_addresses.map((a) => `${a.name ?? ''} <${a.email}>`)
      : []

  return {
    to,
    cc,
    subject,
    replyToMessageId: message.id,
    replyType: type,
    bodyHtml: `<br/><br/><div style="border-left:2px solid #ccc;padding-left:8px;color:#605E5C;">${message.body_html ?? message.body_text ?? ''}</div>`,
  }
}
