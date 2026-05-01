'use client'

import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { messages } from '@/lib/api'
import { FolderTree } from '@/components/mail/FolderTree'
import { MessageListItem } from '@/components/mail/MessageListItem'
import { ReadingPane } from '@/components/mail/ReadingPane'
import { SearchBar } from '@/components/mail/SearchBar'
import { SpinnerOverlay } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Search } from 'lucide-react'

function SearchResults() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined
  const hasAttachment = searchParams.get('has_attachment')
  const dateFrom = searchParams.get('date_from') ?? undefined
  const dateTo = searchParams.get('date_to') ?? undefined
  const folderId = searchParams.get('folder_id') ?? undefined

  const hasAnyFilter = q || from || to || hasAttachment || dateFrom || dateTo || folderId

  const { data, isLoading } = useQuery({
    queryKey: ['messages-search', q, from, to, hasAttachment, dateFrom, dateTo, folderId],
    queryFn: () =>
      messages.search({
        q: q || undefined,
        from: from || undefined,
        to: to || undefined,
        has_attachment: hasAttachment === 'true' ? true : hasAttachment === 'false' ? false : undefined,
        date_from: dateFrom ? `${dateFrom}T00:00:00` : undefined,
        date_to: dateTo ? `${dateTo}T23:59:59` : undefined,
        folder_id: folderId || undefined,
      }),
    enabled: !!hasAnyFilter,
  })

  const results = data?.items ?? []

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <SearchBar />
      <div className="flex-1 overflow-y-auto outlook-scrollbar" role="list" aria-label="Search results">
        {!hasAnyFilter ? (
          <EmptyState icon={Search} title="Search your mail" description="Enter a search term or set filters above." />
        ) : isLoading ? (
          <SpinnerOverlay />
        ) : results.length === 0 ? (
          <EmptyState icon={Search} title="No results" description="No messages matched your search." />
        ) : (
          <>
            <p className="text-xs text-[#605E5C] px-3 py-2 border-b border-[#EDEBE9] bg-[#FAF9F8]">
              {data?.total ?? results.length} result{(data?.total ?? results.length) !== 1 ? 's' : ''}
              {q && <> for &ldquo;{q}&rdquo;</>}
            </p>
            {results.map((msg) => (
              <MessageListItem key={msg.id} message={msg} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export default function MailSearchPage() {
  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel defaultSize={18} minSize={12} maxSize={30}>
        <div className="h-full overflow-hidden"><FolderTree /></div>
      </Panel>
      <PanelResizeHandle className="w-1 bg-[#EDEBE9] hover:bg-[#0078D4] transition-colors cursor-col-resize" />
      <Panel defaultSize={30} minSize={20} maxSize={50}>
        <Suspense fallback={<SpinnerOverlay />}>
          <SearchResults />
        </Suspense>
      </Panel>
      <PanelResizeHandle className="w-1 bg-[#EDEBE9] hover:bg-[#0078D4] transition-colors cursor-col-resize" />
      <Panel defaultSize={52} minSize={30}>
        <div className="h-full overflow-hidden"><ReadingPane /></div>
      </Panel>
    </PanelGroup>
  )
}
