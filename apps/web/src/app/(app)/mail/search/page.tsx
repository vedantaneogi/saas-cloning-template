'use client'

import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { messages, contacts } from '@/lib/api'
import { FolderTree } from '@/components/mail/FolderTree'
import { MessageListItem } from '@/components/mail/MessageListItem'
import { ReadingPane } from '@/components/mail/ReadingPane'
import { SpinnerOverlay } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { formatFileSize } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Search, FileSpreadsheet, FileText, FileType, File as FileIcon, MessageSquare } from 'lucide-react'

type SearchType = 'all' | 'mail' | 'files' | 'teams' | 'people'

const TABS: { id: SearchType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mail', label: 'Mail' },
  { id: 'files', label: 'Files' },
  { id: 'teams', label: 'Teams' },
  { id: 'people', label: 'People' },
]

function attachmentIcon(filename: string, contentType: string) {
  const f = filename.toLowerCase()
  if (contentType.startsWith('image/')) return <FileIcon size={14} className="text-[#605E5C]" />
  if (f.endsWith('.pdf')) return <FileType size={14} className="text-[#D13438]" />
  if (f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv')) return <FileSpreadsheet size={14} className="text-[#107C41]" />
  if (f.endsWith('.docx') || f.endsWith('.doc')) return <FileText size={14} className="text-[#185ABD]" />
  return <FileIcon size={14} className="text-[#605E5C]" />
}

function MailResults({ q, from, to, cc, subject, keywords, hasAttachment, readStatus, dateFrom, dateTo, folderId }: {
  q?: string; from?: string; to?: string; cc?: string; subject?: string; keywords?: string;
  hasAttachment?: string; readStatus?: string; dateFrom?: string; dateTo?: string; folderId?: string
}) {
  const enabled = !!(q || from || to || cc || subject || keywords || hasAttachment || readStatus || dateFrom || dateTo || folderId)
  const { data, isLoading } = useQuery({
    queryKey: ['messages-search', q, from, to, cc, subject, keywords, hasAttachment, readStatus, dateFrom, dateTo, folderId],
    queryFn: () =>
      messages.search({
        q: q || undefined,
        from: from || undefined,
        to: to || undefined,
        cc: cc || undefined,
        subject: subject || undefined,
        keywords: keywords || undefined,
        has_attachment: hasAttachment === 'true' ? true : hasAttachment === 'false' ? false : undefined,
        is_read: readStatus === 'read' ? true : readStatus === 'unread' ? false : undefined,
        date_from: dateFrom ? `${dateFrom}T00:00:00` : undefined,
        date_to: dateTo ? `${dateTo}T23:59:59` : undefined,
        folder_id: folderId || undefined,
      }),
    enabled,
  })

  const results = data?.items ?? []
  if (!enabled) return <EmptyState icon={Search} title="Search your mail" description="Enter a search term or set filters above." />
  if (isLoading) return <SpinnerOverlay />
  if (results.length === 0) return <EmptyState icon={Search} title="No results" description="No messages matched your search." />

  return (
    <>
      <p className="text-xs text-[#605E5C] px-3 py-2 border-b border-[#EDEBE9] bg-[#FAF9F8]">
        {(data as { total_count?: number; total?: number })?.total_count ?? (data as { total?: number })?.total ?? results.length} result(s)
        {q && <> for &ldquo;{q}&rdquo;</>}
      </p>
      {results.map((msg) => (
        <MessageListItem key={msg.id} message={msg} />
      ))}
    </>
  )
}

function FilesResults({ q, from, to, cc, subject, keywords, readStatus, dateFrom, dateTo, folderId }: {
  q?: string; from?: string; to?: string; cc?: string; subject?: string; keywords?: string;
  readStatus?: string; dateFrom?: string; dateTo?: string; folderId?: string
}) {
  // Files tab forces has_attachment=true regardless of the URL param — the
  // tab's whole purpose is "show attachments" and prior versions only fired
  // the query when a text `q` was present, leaving the tab empty when the
  // user navigated in via filters (e.g. /mail/search?has_attachment=true&type=files).
  // Now any filter (or no filter at all) hits the search endpoint with
  // has_attachment=true and we surface every attachment from the result set.
  const { data, isLoading } = useQuery({
    queryKey: ['files-search', q, from, to, cc, subject, keywords, readStatus, dateFrom, dateTo, folderId],
    queryFn: () =>
      messages.search({
        q: q || undefined,
        from: from || undefined,
        to: to || undefined,
        cc: cc || undefined,
        subject: subject || undefined,
        keywords: keywords || undefined,
        has_attachment: true,
        is_read: readStatus === 'read' ? true : readStatus === 'unread' ? false : undefined,
        date_from: dateFrom ? `${dateFrom}T00:00:00` : undefined,
        date_to: dateTo ? `${dateTo}T23:59:59` : undefined,
        folder_id: folderId || undefined,
      }),
  })

  const items = (data?.items ?? []).flatMap((m) =>
    (m.attachments ?? []).map((a) => ({ message: m, attachment: a }))
  )
  // When a free-text query is given, also narrow to filenames matching it
  // (the server matched on subject/body/from, the client narrows on filename
  // so "report.pdf" search returns just the report attachments, not every
  // attachment on a "report" subject).
  const filtered = q
    ? items.filter(({ attachment }) => attachment.filename.toLowerCase().includes(q.toLowerCase()))
    : items

  if (isLoading) return <SpinnerOverlay />
  if (filtered.length === 0) return <EmptyState icon={Search} title="No files" description="No attachments matched." />

  return (
    <>
      <p className="text-xs text-[#605E5C] px-3 py-2 border-b border-[#EDEBE9] bg-[#FAF9F8]">
        {filtered.length} file(s){q ? <> for &ldquo;{q}&rdquo;</> : null}
      </p>
      <ul className="divide-y divide-[#EDEBE9]">
        {filtered.map(({ message, attachment }) => (
          <li key={attachment.id} className="px-3 py-2.5 hover:bg-[#F3F2F1] cursor-default flex items-start gap-2">
            {attachmentIcon(attachment.filename, attachment.content_type)}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#323130] truncate">{attachment.filename}</p>
              <p className="text-xs text-[#605E5C] truncate">
                {formatFileSize(attachment.size_bytes)} · From {message.from_name ?? message.from_address} · {message.subject || '(no subject)'}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function PeopleResults({ q, from }: { q?: string; from?: string }) {
  // Always fire — when there's no query string we still want to show
  // contacts (matches the global-toolbar dropdown's behaviour and means a
  // bare "?type=people" URL surfaces the address book instead of an empty
  // state). When the user typed a `from:` filter we use that as the term
  // too, so /mail/search?from=alice&type=people behaves intuitively.
  const { data, isLoading } = useQuery({
    queryKey: ['people-search'],
    queryFn: () => contacts.list(),
  })
  const term = (q || from || '').toLowerCase()
  const items = (data?.items ?? []).filter((c) => {
    if (!term) return true
    return (
      c.display_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.company?.toLowerCase().includes(term) ||
      c.job_title?.toLowerCase().includes(term)
    )
  })

  if (isLoading) return <SpinnerOverlay />
  if (items.length === 0) return <EmptyState icon={Search} title="No people" description="No contacts matched." />

  return (
    <ul className="divide-y divide-[#EDEBE9]">
      {items.map((c) => (
        <li key={c.id} className="px-3 py-2.5 hover:bg-[#F3F2F1] flex items-center gap-3">
          <Avatar name={c.display_name || c.email} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#323130] truncate">{c.display_name || c.email}</p>
            <p className="text-xs text-[#605E5C] truncate">{c.email}{c.company ? ` · ${c.company}` : ''}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function TeamsResults({ q }: { q?: string }) {
  // Stub — Teams isn't a real data source in this clone. Show seeded chats.
  const seed = [
    { id: 't1', kind: 'Chat', name: 'Project Alpha', last: 'Alice: pushed the latest deck', when: '9:42 AM' },
    { id: 't2', kind: 'Channel', name: 'Engineering · General', last: 'Bob: anyone seeing flaky CI?', when: 'Wed' },
    { id: 't3', kind: 'Chat', name: 'Carol Williams', last: 'Carol: thanks for the proposal', when: 'Mon' },
    { id: 't4', kind: 'Channel', name: 'Design · Reviews', last: 'David: feedback on iconography', when: 'Apr 23' },
  ]
  const items = q
    ? seed.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()) || t.last.toLowerCase().includes(q.toLowerCase()))
    : seed

  if (items.length === 0) return <EmptyState icon={Search} title="No Teams matches" description="No chats or channels matched." />

  return (
    <ul className="divide-y divide-[#EDEBE9]">
      {items.map((t) => (
        <li key={t.id} className="px-3 py-2.5 hover:bg-[#F3F2F1] flex items-start gap-2.5">
          <MessageSquare size={14} className="text-[#6264A7] mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-[#323130] truncate">
                <span className="text-[10px] uppercase tracking-wide text-[#605E5C] mr-1.5">{t.kind}</span>
                {t.name}
              </p>
              <span className="text-xs text-[#605E5C] flex-shrink-0">{t.when}</span>
            </div>
            <p className="text-xs text-[#605E5C] truncate">{t.last}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function SearchResults() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const type = (searchParams.get('type') as SearchType) ?? 'all'
  const q = searchParams.get('q') ?? ''
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined
  const cc = searchParams.get('cc') ?? undefined
  const subject = searchParams.get('subject') ?? undefined
  const keywords = searchParams.get('keywords') ?? undefined
  const hasAttachment = searchParams.get('has_attachment') ?? undefined
  const readStatus = searchParams.get('read_status') ?? undefined
  const dateFrom = searchParams.get('date_from') ?? undefined
  const dateTo = searchParams.get('date_to') ?? undefined
  const folderId = searchParams.get('folder_id') ?? undefined

  const setType = (t: SearchType) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', t)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Type tabs — search input lives in the top toolbar */}
      <div className="flex border-b border-[#EDEBE9] bg-white flex-shrink-0">
        {TABS.map((tab) => {
          const active = type === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setType(tab.id)}
              className={cn(
                'px-4 py-2 text-sm transition-colors relative',
                active
                  ? 'text-[#0078D4] font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#0078D4]'
                  : 'text-[#605E5C] hover:text-[#323130] hover:bg-[#F3F2F1]'
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto outlook-scrollbar" role="list" aria-label={`Search results · ${type}`}>
        {(type === 'all' || type === 'mail') && (
          <MailResults q={q} from={from} to={to} cc={cc} subject={subject} keywords={keywords} hasAttachment={hasAttachment} readStatus={readStatus} dateFrom={dateFrom} dateTo={dateTo} folderId={folderId} />
        )}
        {type === 'files' && (
          <FilesResults q={q || undefined} from={from} to={to} cc={cc} subject={subject} keywords={keywords} readStatus={readStatus} dateFrom={dateFrom} dateTo={dateTo} folderId={folderId} />
        )}
        {type === 'teams' && <TeamsResults q={q || undefined} />}
        {type === 'people' && <PeopleResults q={q || undefined} from={from} />}
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
