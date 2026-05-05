'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Paperclip, Download, Eye, ChevronDown, Copy, Globe, Monitor, Cloud } from 'lucide-react'
import type { Attachment } from '@/lib/api'
import { formatFileSize } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'

function FileTextPreview({ blobUrl, filename }: { blobUrl: string; filename: string }) {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    fetch(blobUrl).then((r) => r.text()).then(setText).catch(() => setText('Failed to load file content'))
  }, [blobUrl])
  return (
    <div className="w-full h-[60vh] flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#323130] text-white text-sm rounded-t">
        <span className="font-medium">{filename}</span>
      </div>
      <pre className="flex-1 bg-white border border-[#EDEBE9] rounded-b overflow-auto p-4 text-xs text-[#323130] font-mono whitespace-pre-wrap">
        {text ?? 'Loading...'}
      </pre>
    </div>
  )
}

interface AttachmentBarProps {
  attachments: Attachment[]
}

function fileIcon(contentType: string): string {
  if (contentType.startsWith('image/')) return '🖼️'
  if (contentType === 'application/pdf') return '📄'
  if (contentType.includes('word')) return '📝'
  if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊'
  if (contentType.includes('powerpoint') || contentType.includes('presentation')) return '📋'
  if (contentType.includes('zip') || contentType.includes('compressed')) return '🗜️'
  return '📎'
}

function AttachmentItem({ att }: { att: Attachment }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const showNotification = useUIStore((s) => s.showNotification)
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
  const downloadPath = `${apiBase}/messages/${att.message_id}/attachments/${att.id}/download`
  const token = useAuthStore((s) => s.token)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  // Fetch attachment with auth token and create blob URL for preview
  const fetchBlob = useCallback(async () => {
    if (blobUrl) return blobUrl
    try {
      const res = await fetch(downloadPath, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return null
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
      return url
    } catch { return null }
  }, [downloadPath, token, blobUrl])

  const handlePreview = async () => {
    await fetchBlob()
    setPreviewOpen(true)
    setMenuOpen(false)
  }

  const handleDownload = async () => {
    const url = await fetchBlob()
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = att.filename
      a.click()
    }
    setMenuOpen(false)
  }

  // Cleanup blob URL
  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [blobUrl])

  return (
    <div className="relative flex items-center gap-2 bg-white border border-[#EDEBE9] rounded px-2.5 py-1.5 hover:border-[#D2D0CE] transition-colors group">
      <span className="text-base leading-none" aria-hidden="true">
        {fileIcon(att.content_type)}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#323130] truncate max-w-[140px]">
          {att.filename}
        </p>
        <p className="text-[10px] text-[#605E5C]">
          {formatFileSize(att.size_bytes)}
        </p>
      </div>

      {/* Preview modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewOpen(false)}>
          <div className="bg-white rounded-lg shadow-outlook-lg max-w-3xl max-h-[80vh] w-full mx-4 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDEBE9]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{fileIcon(att.content_type)}</span>
                <span className="text-sm font-medium text-[#323130] truncate">{att.filename}</span>
                <span className="text-xs text-[#605E5C]">({formatFileSize(att.size_bytes)})</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={handleDownload} className="text-xs text-[#0078D4] hover:underline flex items-center gap-1">
                  <Download size={12} /> Download
                </button>
                <button onClick={() => setPreviewOpen(false)} className="text-[#605E5C] hover:text-[#323130] p-1">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#FAF9F8]">
              {blobUrl && att.content_type.startsWith('image/') ? (
                <img src={blobUrl} alt={att.filename} className="max-w-full max-h-[60vh] object-contain rounded" />
              ) : blobUrl && att.content_type === 'application/pdf' ? (
                <iframe src={blobUrl} className="w-full h-[60vh] border-0 rounded" title={att.filename} />
              ) : blobUrl && (att.content_type.includes('text') || att.filename.endsWith('.csv') || att.filename.endsWith('.txt') || att.filename.endsWith('.json') || att.filename.endsWith('.xml') || att.filename.endsWith('.html')) ? (
                <FileTextPreview blobUrl={blobUrl} filename={att.filename} />
              ) : blobUrl && (att.content_type.includes('spreadsheet') || att.content_type.includes('excel') || att.filename.endsWith('.xlsx') || att.filename.endsWith('.xls') || att.filename.endsWith('.csv')) ? (
                <div className="w-full h-[60vh] flex flex-col">
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#107C41] text-white text-sm rounded-t">
                    <span className="font-semibold">Excel</span>
                    <span className="text-xs opacity-80">{att.filename}</span>
                  </div>
                  <div className="flex-1 bg-white border border-[#EDEBE9] rounded-b overflow-auto p-4">
                    <p className="text-sm text-[#605E5C] text-center py-8">
                      Spreadsheet preview is available when viewing real Excel files.<br/>
                      <button onClick={handleDownload} className="text-[#0078D4] hover:underline mt-2 inline-flex items-center gap-1">
                        <Download size={13} /> Download to open in Excel
                      </button>
                    </p>
                  </div>
                </div>
              ) : blobUrl && (att.content_type.includes('word') || att.filename.endsWith('.docx') || att.filename.endsWith('.doc')) ? (
                <div className="w-full h-[60vh] flex flex-col">
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#185ABD] text-white text-sm rounded-t">
                    <span className="font-semibold">Word</span>
                    <span className="text-xs opacity-80">{att.filename}</span>
                  </div>
                  <div className="flex-1 bg-white border border-[#EDEBE9] rounded-b overflow-auto p-4">
                    <p className="text-sm text-[#605E5C] text-center py-8">
                      Document preview is available when viewing real Word files.<br/>
                      <button onClick={handleDownload} className="text-[#0078D4] hover:underline mt-2 inline-flex items-center gap-1">
                        <Download size={13} /> Download to open in Word
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <span className="text-4xl mb-3 block">{fileIcon(att.content_type)}</span>
                  <p className="text-sm font-medium text-[#323130] mb-1">{att.filename}</p>
                  <p className="text-xs text-[#605E5C] mb-3">{formatFileSize(att.size_bytes)} — {att.content_type}</p>
                  <button onClick={handleDownload} className="text-sm text-[#0078D4] hover:underline flex items-center gap-1 mx-auto">
                    <Download size={13} /> Download to view
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dropdown chevron */}
      <div ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
          aria-label={`Options for ${att.filename}`}
          className="text-[#605E5C] hover:text-[#323130] p-0.5 rounded hover:bg-[#EDEBE9] transition-colors"
        >
          <ChevronDown size={12} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 bottom-full mb-1 z-50 w-44 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in">
            <button
              onClick={(e) => { e.stopPropagation(); handlePreview() }}
              className="w-full flex items-center gap-2 text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors"
            >
              <Eye size={14} className="text-[#605E5C]" /> Preview
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handlePreview(); }}
              className="w-full flex items-center gap-2 text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors"
            >
              <Globe size={14} className="text-[#605E5C]" /> Edit in Browser
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload() }}
              className="w-full flex items-center gap-2 text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors"
            >
              <Monitor size={14} className="text-[#605E5C]" /> Edit in Excel desktop app
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); showNotification('Save to OneDrive is not available yet'); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 text-left text-sm text-[#A19F9D] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors cursor-not-allowed"
            >
              <Cloud size={14} /> Save to OneDrive
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                navigator.clipboard.writeText(att.filename)
                showNotification(`Copied "${att.filename}" to clipboard`)
                setMenuOpen(false)
              }}
              className="w-full flex items-center gap-2 text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors"
            >
              <Copy size={14} className="text-[#605E5C]" /> Copy
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload() }}
              className="w-full flex items-center gap-2 text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors"
            >
              <Download size={14} className="text-[#605E5C]" /> Download
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function AttachmentBar({ attachments }: AttachmentBarProps) {
  if (!attachments || attachments.length === 0) return null

  return (
    <div
      className="border-t border-[#EDEBE9] bg-[#FAF9F8] px-4 py-2"
      aria-label="Attachments"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Paperclip size={14} className="text-[#605E5C]" />
        <span className="text-xs font-medium text-[#605E5C]">
          {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {attachments.map((att) => (
          <AttachmentItem key={att.id} att={att} />
        ))}
      </div>
    </div>
  )
}