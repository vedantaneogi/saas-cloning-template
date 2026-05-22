
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from '@/lib/next-compat'
import { Search, X, SlidersHorizontal, Paperclip } from 'lucide-react'
import { useMailStore } from '@/store/mail'
import { folders } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setSearchQuery = useMailStore((s) => s.setSearchQuery)

  const [input, setInput] = useState(searchParams.get('q') ?? '')
  const [showFilters, setShowFilters] = useState(false)
  const [from, setFrom] = useState(searchParams.get('from') ?? '')
  const [to, setTo] = useState(searchParams.get('to') ?? '')
  const [cc, setCc] = useState(searchParams.get('cc') ?? '')
  const [subject, setSubject] = useState(searchParams.get('subject') ?? '')
  const [keywords, setKeywords] = useState(searchParams.get('keywords') ?? '')
  const [hasAttachment, setHasAttachment] = useState(searchParams.get('has_attachment') === 'true')
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') ?? '')
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') ?? '')
  const [folderId, setFolderId] = useState(searchParams.get('folder_id') ?? '')
  const [folderScope, setFolderScope] = useState<'all' | 'current' | 'subfolders' | 'favorites' | string>('all')

  const { data: folderList = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => folders.list(),
  })

  // Sync input from URL on mount
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setInput(q)
    setSearchQuery(q)
  }, [searchParams, setSearchQuery])

  const activeFilterCount = [from, to, cc, subject, keywords, hasAttachment, dateFrom, dateTo, folderId].filter(Boolean).length

  const buildUrl = (q: string) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (cc) params.set('cc', cc)
    if (subject) params.set('subject', subject)
    if (keywords) params.set('keywords', keywords)
    if (hasAttachment) params.set('has_attachment', 'true')
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    if (folderId) params.set('folder_id', folderId)
    return `/mail/search?${params}`
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = input.trim()
    setSearchQuery(q)
    router.push(buildUrl(q))
  }

  const clearSearch = () => {
    setInput(''); setFrom(''); setTo(''); setCc(''); setSubject(''); setKeywords('')
    setHasAttachment(false); setDateFrom(''); setDateTo(''); setFolderId(''); setFolderScope('all')
    setSearchQuery('')
    router.push('/mail/inbox')
  }

  const clearFilter = (key: string) => {
    const setters: Record<string, () => void> = {
      from: () => setFrom(''), to: () => setTo(''), cc: () => setCc(''),
      subject: () => setSubject(''), keywords: () => setKeywords(''),
      has_attachment: () => setHasAttachment(false),
      date_from: () => setDateFrom(''), date_to: () => setDateTo(''),
      folder_id: () => setFolderId(''),
    }
    setters[key]?.()
    setTimeout(() => {
      const params = new URLSearchParams()
      const q = input.trim()
      if (q) params.set('q', q)
      if (key !== 'from' && from) params.set('from', from)
      if (key !== 'to' && to) params.set('to', to)
      if (key !== 'cc' && cc) params.set('cc', cc)
      if (key !== 'subject' && subject) params.set('subject', subject)
      if (key !== 'keywords' && keywords) params.set('keywords', keywords)
      if (key !== 'has_attachment' && hasAttachment) params.set('has_attachment', 'true')
      if (key !== 'date_from' && dateFrom) params.set('date_from', dateFrom)
      if (key !== 'date_to' && dateTo) params.set('date_to', dateTo)
      if (key !== 'folder_id' && folderId) params.set('folder_id', folderId)
      router.push(`/mail/search?${params}`)
    }, 0)
  }

  const chips = [
    from && { key: 'from', label: 'From', value: from },
    to && { key: 'to', label: 'To', value: to },
    cc && { key: 'cc', label: 'Cc', value: cc },
    subject && { key: 'subject', label: 'Subject', value: subject },
    keywords && { key: 'keywords', label: 'Keywords', value: keywords },
    hasAttachment && { key: 'has_attachment', label: 'Has attachment', value: '' },
    dateFrom && { key: 'date_from', label: 'After', value: dateFrom },
    dateTo && { key: 'date_to', label: 'Before', value: dateTo },
    folderId && { key: 'folder_id', label: 'Folder', value: folderList.find(f => f.id === folderId)?.name ?? folderId },
  ].filter(Boolean) as { key: string; label: string; value: string }[]

  return (
    <div className="p-3 border-b border-[#EDEBE9]" role="search">
      <form onSubmit={handleSearch}>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605E5C] pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search mail"
              aria-label="Search mail"
              className="w-full bg-[#F3F2F1] border border-[#EDEBE9] text-[#323130] text-sm pl-9 pr-8 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] focus:bg-white transition-colors"
            />
            {(input || activeFilterCount > 0) && (
              <button type="button" onClick={clearSearch} aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#605E5C] hover:text-[#323130]">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Advanced search filters"
            aria-expanded={showFilters}
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 rounded border text-xs transition-colors flex-shrink-0',
              showFilters || activeFilterCount > 0
                ? 'border-[#0078D4] text-[#0078D4] bg-[#EBF3FB]'
                : 'border-[#EDEBE9] text-[#605E5C] hover:bg-[#F3F2F1]'
            )}
          >
            <SlidersHorizontal size={13} />
            {activeFilterCount > 0 && <span className="w-4 h-4 bg-[#0078D4] text-white rounded-full text-[10px] flex items-center justify-center">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Search filters — vertical layout matching Outlook */}
        {showFilters && (
          <div className="mt-2 space-y-3 p-4 bg-white border border-[#EDEBE9] rounded shadow-outlook text-sm">
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">Search in</label>
              <select value={folderScope} onChange={(e) => {
                const val = e.target.value
                setFolderScope(val)
                if (val === 'all' || val === 'current' || val === 'subfolders' || val === 'favorites') {
                  setFolderId('')
                } else {
                  setFolderId(val)
                }
              }}
                aria-label="Search in folder"
                className="w-full border-b-2 border-[#0078D4] border-t-0 border-l-0 border-r-0 px-0 py-1.5 text-sm text-[#323130] focus:outline-none bg-transparent">
                <option value="all">All folders</option>
                <option value="current">Current folder</option>
                <option value="subfolders">Subfolders</option>
                <option value="favorites">Favorites</option>
                <option disabled>──────────</option>
                {folderList.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">From</label>
              <input type="text" value={from} onChange={(e) => setFrom(e.target.value)}
                aria-label="From"
                className="w-full border-b border-[#8A8886] border-t-0 border-l-0 border-r-0 px-0 py-1.5 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">To</label>
              <input type="text" value={to} onChange={(e) => setTo(e.target.value)}
                aria-label="To"
                className="w-full border-b border-[#8A8886] border-t-0 border-l-0 border-r-0 px-0 py-1.5 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">Cc</label>
              <input type="text" value={cc} onChange={(e) => setCc(e.target.value)}
                aria-label="Cc"
                className="w-full border-b border-[#8A8886] border-t-0 border-l-0 border-r-0 px-0 py-1.5 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">Subject</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                aria-label="Subject"
                className="w-full border-b border-[#8A8886] border-t-0 border-l-0 border-r-0 px-0 py-1.5 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">Keywords</label>
              <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)}
                aria-label="Keywords"
                className="w-full border-b border-[#8A8886] border-t-0 border-l-0 border-r-0 px-0 py-1.5 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">Date</label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <span className="text-xs text-[#605E5C]">Start</span>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    aria-label="Start date"
                    className="w-full border-b border-[#8A8886] border-t-0 border-l-0 border-r-0 px-0 py-1 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent" />
                </div>
                <div className="flex-1">
                  <span className="text-xs text-[#605E5C]">End</span>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    aria-label="End date"
                    className="w-full border-b border-[#8A8886] border-t-0 border-l-0 border-r-0 px-0 py-1 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">Read status</label>
              <select value="" onChange={() => {}}
                aria-label="Read status"
                className="w-full border-b border-[#8A8886] border-t-0 border-l-0 border-r-0 px-0 py-1.5 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent">
                <option value="">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={hasAttachment} onChange={(e) => setHasAttachment(e.target.checked)}
                aria-label="Attachments"
                className="rounded border-[#8A8886] w-4 h-4" />
              <span className="text-sm text-[#323130]">Attachments</span>
            </label>
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={() => {}}
                className="text-sm text-[#0078D4] hover:underline flex items-center gap-1">
                + Add filters
              </button>
              <div className="flex gap-2">
                <button type="submit"
                  className="bg-[#0078D4] hover:bg-[#106EBE] text-white text-sm font-medium px-6 py-1.5 rounded transition-colors">
                  Search
                </button>
                <button type="button" onClick={clearSearch}
                  className="text-sm text-[#323130] border border-[#8A8886] px-4 py-1.5 rounded hover:bg-[#F3F2F1] transition-colors">
                  Clear filters
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {chips.map((chip) => (
            <span key={chip.key}
              className="inline-flex items-center gap-1 text-xs bg-[#EBF3FB] text-[#0078D4] px-2 py-0.5 rounded-full">
              {chip.label}{chip.value ? `: ${chip.value}` : ''}
              <button onClick={() => clearFilter(chip.key)} aria-label={`Remove ${chip.label} filter`}
                className="hover:text-[#005A9E]">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
