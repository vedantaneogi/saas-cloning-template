'use client'

import { Paperclip, Download } from 'lucide-react'
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
          <div
            key={att.id}
            className="flex items-center gap-2 bg-white border border-[#EDEBE9] rounded px-2.5 py-1.5 hover:border-[#D2D0CE] transition-colors group"
          >
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
            <button
              aria-label={`Download ${att.filename}`}
              className="text-[#605E5C] hover:text-[#0078D4] opacity-0 group-hover:opacity-100 transition-all"
            >
              <Download size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
