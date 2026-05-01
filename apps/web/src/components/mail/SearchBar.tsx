'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const [hasAttachment, setHasAttachment] = useState(searchParams.get('has_attachment') === 'true')
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') ?? '')
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') ?? '')
  const [folderId, setFolderId] = useState(searchParams.get('folder_id') ?? '')

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

  const activeFilterCount = [from, to, hasAttachment, dateFrom, dateTo, folderId].filter(Boolean).length

  const buildUrl = (q: string) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
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
    setInput('')
    setFrom('')
    setTo('')
    setHasAttachment(false)
    setDateFrom('')
    setDateTo('')
    setFolderId('')
    setSearchQuery('')
    router.push('/mail/inbox')
  }

  const clearFilter = (key: string) => {
    if (key === 'from') setFrom('')
    if (key === 'to') setTo('')
    if (key === 'has_attachment') setHasAttachment(false)
    if (key === 'date_from') setDateFrom('')
    if (key === 'date_to') setDateTo('')
    if (key === 'folder_id') setFolderId('')
    // Re-navigate with updated params
    setTimeout(() => {
      const params = new URLSearchParams()
      const q = input.trim()
      if (q) params.set('q', q)
      if (key !== 'from' && from) params.set('from', from)
      if (key !== 'to' && to) params.set('to', to)
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

        {/* Advanced filter panel */}
        {showFilters && (
          <div className="mt-2 space-y-2 p-3 bg-[#FAF9F8] border border-[#EDEBE9] rounded text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-[#605E5C] mb-0.5">From</label>
                <input type="text" value={from} onChange={(e) => setFrom(e.target.value)}
                  placeholder="Sender email or name"
                  aria-label="Filter by sender"
                  className="w-full border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] text-xs focus:outline-none focus:ring-1 focus:ring-[#0078D4]" />
              </div>
              <div>
                <label className="block text-xs text-[#605E5C] mb-0.5">To</label>
                <input type="text" value={to} onChange={(e) => setTo(e.target.value)}
                  placeholder="Recipient email or name"
                  aria-label="Filter by recipient"
                  className="w-full border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] text-xs focus:outline-none focus:ring-1 focus:ring-[#0078D4]" />
              </div>
              <div>
                <label className="block text-xs text-[#605E5C] mb-0.5">After</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="Messages after date"
                  className="w-full border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] text-xs focus:outline-none focus:ring-1 focus:ring-[#0078D4]" />
              </div>
              <div>
                <label className="block text-xs text-[#605E5C] mb-0.5">Before</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  aria-label="Messages before date"
                  className="w-full border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] text-xs focus:outline-none focus:ring-1 focus:ring-[#0078D4]" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#605E5C] mb-0.5">Folder</label>
              <select value={folderId} onChange={(e) => setFolderId(e.target.value)}
                aria-label="Filter by folder"
                className="w-full border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] text-xs focus:outline-none focus:ring-1 focus:ring-[#0078D4] bg-white">
                <option value="">All folders</option>
                {folderList.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hasAttachment} onChange={(e) => setHasAttachment(e.target.checked)}
                aria-label="Has attachment"
                className="rounded border-[#D2D0CE]" />
              <span className="flex items-center gap-1 text-xs text-[#323130]">
                <Paperclip size={11} /> Has attachment
              </span>
            </label>
            <button type="submit"
              className="w-full bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-medium py-1.5 rounded transition-colors">
              Search
            </button>
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
