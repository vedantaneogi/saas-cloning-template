import { create } from 'zustand'

interface MailState {
  selectedFolderId: string | null
  selectedFolderSlug: string
  selectedMessageId: string | null
  conversationGrouping: boolean
  focusedInbox: boolean
  readingPanePosition: 'right' | 'bottom' | 'off'
  sortBy: 'date' | 'from' | 'subject' | 'size'
  sortOrder: 'asc' | 'desc'
  searchQuery: string

  setSelectedFolderId: (id: string | null) => void
  setSelectedFolderSlug: (slug: string) => void
  setSelectedMessageId: (id: string | null) => void
  setConversationGrouping: (value: boolean) => void
  setFocusedInbox: (value: boolean) => void
  setReadingPanePosition: (pos: 'right' | 'bottom' | 'off') => void
  setSortBy: (sort: MailState['sortBy']) => void
  setSortOrder: (order: MailState['sortOrder']) => void
  setSearchQuery: (query: string) => void
}

export const useMailStore = create<MailState>((set) => ({
  selectedFolderId: null,
  selectedFolderSlug: 'inbox',
  selectedMessageId: null,
  conversationGrouping: true,
  focusedInbox: false,
  readingPanePosition: 'right',
  sortBy: 'date',
  sortOrder: 'desc',
  searchQuery: '',

  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
  setSelectedFolderSlug: (slug) => set({ selectedFolderSlug: slug }),
  setSelectedMessageId: (id) => set({ selectedMessageId: id }),
  setConversationGrouping: (value) => set({ conversationGrouping: value }),
  setFocusedInbox: (value) => set({ focusedInbox: value }),
  setReadingPanePosition: (pos) => set({ readingPanePosition: pos }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
