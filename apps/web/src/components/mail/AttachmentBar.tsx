'use client'

import { useState, useRef, useEffect } from 'react'
import { Paperclip, Download, Eye, ChevronDown, Copy } from 'lucide-react'
import type { Attachment } from '@/lib/api'
import { formatFileSize } from '@/lib/utils'

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

  const downloadUrl = `/api/v1/messages/${att.message_id}/attachments/${att.id}/download`

  const [previewOpen, setPreviewOpen] = useState(false)

  const handlePreview = () => {
    setPreviewOpen(true)
    setMenuOpen(false)
  }

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
                <a href={downloadUrl} download={att.filename} className="text-xs text-[#0078D4] hover:underline flex items-center gap-1">
                  <Download size={12} /> Download
                </a>
                <button onClick={() => setPreviewOpen(false)} className="text-[#605E5C] hover:text-[#323130] p-1">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#FAF9F8]">
              {att.content_type.startsWith('image/') ? (
                <img src={downloadUrl} alt={att.filename} className="max-w-full max-h-[60vh] object-contain rounded" />
              ) : att.content_type === 'application/pdf' ? (
                <iframe src={downloadUrl} className="w-full h-[60vh] border-0 rounded" title={att.filename} />
              ) : (
                <div className="text-center py-12">
                  <span className="text-4xl mb-3 block">{fileIcon(att.content_type)}</span>
                  <p className="text-sm font-medium text-[#323130] mb-1">{att.filename}</p>
                  <p className="text-xs text-[#605E5C] mb-3">{formatFileSize(att.size_bytes)} — {att.content_type}</p>
                  <a href={downloadUrl} download={att.filename} className="text-sm text-[#0078D4] hover:underline">Download to view</a>
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
              onClick={(e) => {
                e.stopPropagation()
                navigator.clipboard.writeText(att.filename)
                setMenuOpen(false)
              }}
              className="w-full flex items-center gap-2 text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors"
            >
              <Copy size={14} className="text-[#605E5C]" /> Copy
            </button>
            <a
              href={downloadUrl}
              download={att.filename}
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors"
            >
              <Download size={14} className="text-[#605E5C]" /> Download
            </a>
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