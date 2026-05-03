import { create } from 'zustand'

interface MailState {
  selectedFolderId: string | null
  selectedFolderSlug: string
  selectedMessageId: string | null
  selectedMessageIds: Set<string>
  conversationGrouping: boolean
  focusedInbox: boolean
  readingPanePosition: 'right' | 'bottom' | 'off'
  sortBy: 'date' | 'from' | 'subject' | 'size'
  sortOrder: 'asc' | 'desc'
  searchQuery: string

  setSelectedFolderId: (id: string | null) => void
  setSelectedFolderSlug: (slug: string) => void
  setSelectedMessageId: (id: string | null) => void
  toggleMessageSelection: (id: string) => void
  selectAllMessages: (ids: string[]) => void
  clearSelection: () => void
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
  selectedMessageIds: new Set(),
  conversationGrouping: true,
  focusedInbox: false,
  readingPanePosition: 'right',
  sortBy: 'date',
  sortOrder: 'desc',
  searchQuery: '',

  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
  setSelectedFolderSlug: (slug) => set({ selectedFolderSlug: slug }),
  setSelectedMessageId: (id) => set({ selectedMessageId: id }),
  toggleMessageSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedMessageIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selectedMessageIds: next }
    }),
  selectAllMessages: (ids) => set({ selectedMessageIds: new Set(ids) }),
  clearSelection: () => set({ selectedMessageIds: new Set() }),
  setConversationGrouping: (value) => set({ conversationGrouping: value }),
  setFocusedInbox: (value) => set({ focusedInbox: value }),
  setReadingPanePosition: (pos) => set({ readingPanePosition: pos }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
