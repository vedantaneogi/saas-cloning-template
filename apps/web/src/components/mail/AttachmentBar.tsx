'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Paperclip, Download, Eye, ChevronDown, Copy, Globe, Monitor, Cloud } from 'lucide-react'
import type { Attachment } from '@/lib/api'
import { formatFileSize } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'

// ── Excel preview component using SheetJS ────────────────────────
function ExcelPreview({ blobUrl, filename }: { blobUrl: string; filename: string }) {
  const [sheetData, setSheetData] = useState<{ headers: string[]; rows: string[][]; sheetNames: string[]; activeSheet: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeSheet, setActiveSheet] = useState('')

  const parseSheet = useCallback(async (sheetName?: string) => {
    try {
      const XLSX = (await import('xlsx'))
      const res = await fetch(blobUrl)
      const buf = await res.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const name = sheetName || wb.SheetNames[0]
      const ws = wb.Sheets[name]
      const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
      const headers = (json[0] || []).map(String)
      const rows = json.slice(1).map((r) => r.map(String))
      setSheetData({ headers, rows, sheetNames: wb.SheetNames, activeSheet: name })
      setActiveSheet(name)
    } catch {
      setError('Could not parse spreadsheet')
    }
  }, [blobUrl])

  useEffect(() => { parseSheet() }, [parseSheet])

  if (error) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center">
        <p className="text-sm text-[#605E5C]">{error}</p>
      </div>
    )
  }
  if (!sheetData) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center">
        <p className="text-sm text-[#605E5C]">Loading spreadsheet...</p>
      </div>
    )
  }

  return (
    <div className="w-full h-[70vh] flex flex-col">
      {/* Excel-style green toolbar */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-[#107C41] text-white text-sm">
        <span className="font-semibold">Excel</span>
        <span className="text-xs opacity-80">{filename}</span>
      </div>
      {/* Formula bar */}
      <div className="flex items-center border-b border-[#EDEBE9] bg-white">
        <div className="px-2 py-1 border-r border-[#EDEBE9] text-xs text-[#605E5C] w-16 text-center">A1</div>
        <div className="flex-1 px-2 py-1 text-xs text-[#323130]">
          {sheetData.headers[0] || ''}
        </div>
      </div>
      {/* Spreadsheet grid */}
      <div className="flex-1 overflow-auto bg-white border border-[#EDEBE9]">
        <table className="border-collapse text-xs w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#F3F2F1]">
              <th className="border border-[#D2D0CE] px-2 py-1 text-center text-[#605E5C] font-normal w-10 bg-[#F3F2F1]" />
              {sheetData.headers.map((_, ci) => (
                <th key={ci} className="border border-[#D2D0CE] px-2 py-1 text-center text-[#605E5C] font-normal min-w-[80px] bg-[#F3F2F1]">
                  {String.fromCharCode(65 + ci)}
                </th>
              ))}
            </tr>
            <tr className="bg-[#E8F0FE]">
              <th className="border border-[#D2D0CE] px-2 py-1 text-center text-[#605E5C] font-semibold text-[10px] w-10 bg-[#F3F2F1]">1</th>
              {sheetData.headers.map((h, ci) => (
                <th key={ci} className="border border-[#D2D0CE] px-2 py-1 text-left text-[#323130] font-semibold bg-[#E8F0FE] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheetData.rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-[#F3F2F1]">
                <td className="border border-[#D2D0CE] px-2 py-1 text-center text-[#605E5C] font-normal text-[10px] bg-[#F3F2F1] w-10">
                  {ri + 2}
                </td>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-[#D2D0CE] px-2 py-1 text-[#323130] whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Sheet tabs */}
      {sheetData.sheetNames.length > 0 && (
        <div className="flex items-center border-t border-[#EDEBE9] bg-[#F3F2F1]">
          {sheetData.sheetNames.map((name) => (
            <button
              key={name}
              onClick={() => parseSheet(name)}
              className={`px-3 py-1.5 text-xs border-r border-[#D2D0CE] transition-colors ${
                activeSheet === name
                  ? 'bg-white text-[#323130] font-medium'
                  : 'text-[#605E5C] hover:bg-[#EDEBE9]'
              }`}
            >
              {name}
            </button>
          ))}
          <div className="flex-1 bg-[#F3F2F1]" />
          <span className="text-[10px] text-[#A19F9D] px-2">Workbook Statistics</span>
        </div>
      )}
    </div>
  )
}

// ── Text file preview ────────────────────────────────────────────
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

// ── PowerPoint preview — extract slide text from .pptx via JSZip ─────────────
// .pptx is an OPC zip; ppt/slides/slideN.xml holds runs of text under <a:t>.
// We render each slide as a card showing the extracted text outline. This is
// a faithful preview for text-heavy decks; image/shape geometry is not rendered.
function PptxPreview({ blobUrl, filename }: { blobUrl: string; filename: string }) {
  const [slides, setSlides] = useState<{ title: string; bullets: string[] }[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const JSZip = (await import('jszip')).default
        const buf = await fetch(blobUrl).then((r) => r.arrayBuffer())
        const zip = await JSZip.loadAsync(buf)
        const slideEntries = Object.keys(zip.files)
          .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          .sort((a, b) => {
            const an = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] ?? '0', 10)
            const bn = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] ?? '0', 10)
            return an - bn
          })
        const out: { title: string; bullets: string[] }[] = []
        for (const entry of slideEntries) {
          const xml = await zip.file(entry)!.async('string')
          // Each <p:sp> shape can hold <a:p> paragraphs; each <a:p> contains
          // one or more <a:t> runs. Joining runs within a paragraph reconstructs
          // the visible text line; the first paragraph that has text becomes
          // the slide title.
          const paragraphs: string[] = []
          const paraRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g
          const tRegex = /<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g
          let pm
          while ((pm = paraRegex.exec(xml)) !== null) {
            const inner = pm[1]
            const runs: string[] = []
            let tm
            while ((tm = tRegex.exec(inner)) !== null) {
              runs.push(decodeXmlEntities(tm[1]))
            }
            const line = runs.join('').trim()
            if (line) paragraphs.push(line)
          }
          if (paragraphs.length === 0) {
            out.push({ title: '(blank slide)', bullets: [] })
          } else {
            out.push({ title: paragraphs[0], bullets: paragraphs.slice(1) })
          }
        }
        if (!cancelled) setSlides(out)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to render slides')
      }
    })()
    return () => { cancelled = true }
  }, [blobUrl])

  return (
    <div className="w-full h-[75vh] flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#C43E1C] text-white text-sm rounded-t">
        <span className="font-semibold">PowerPoint</span>
        <span className="text-xs opacity-80 truncate">{filename}</span>
        {slides && <span className="ml-auto text-xs opacity-90">{slides.length} slide{slides.length === 1 ? '' : 's'}</span>}
      </div>
      <div className="flex-1 bg-[#FAF9F8] border border-[#EDEBE9] rounded-b overflow-auto p-4">
        {error ? (
          <p className="text-sm text-[#D13438]">{error}</p>
        ) : slides === null ? (
          <p className="text-sm text-[#605E5C]">Rendering presentation…</p>
        ) : slides.length === 0 ? (
          <p className="text-sm text-[#605E5C]">No slides found.</p>
        ) : (
          <div className="space-y-4">
            {slides.map((s, i) => (
              <div key={i} className="bg-white border border-[#EDEBE9] rounded shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F3F2F1] border-b border-[#EDEBE9]">
                  <span className="w-5 h-5 rounded-full bg-[#C43E1C] text-white text-[10px] font-semibold flex items-center justify-center">{i + 1}</span>
                  <span className="text-xs text-[#605E5C]">Slide {i + 1}</span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-[#323130] mb-3">{s.title}</h3>
                  {s.bullets.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-[#323130]">
                      {s.bullets.map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function WordPreview({ blobUrl, filename }: { blobUrl: string; filename: string }) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const buf = await fetch(blobUrl).then((r) => r.arrayBuffer())
        const mammoth = (await import('mammoth')).default ?? (await import('mammoth'))
        const result = await mammoth.convertToHtml({ arrayBuffer: buf })
        if (!cancelled) setHtml(result.value || '<p><em>(empty document)</em></p>')
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to render document')
      }
    })()
    return () => { cancelled = true }
  }, [blobUrl])
  return (
    <div className="w-full h-[60vh] flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#185ABD] text-white text-sm rounded-t">
        <span className="font-semibold">Word</span>
        <span className="text-xs opacity-80 truncate">{filename}</span>
      </div>
      <div className="flex-1 bg-white border border-[#EDEBE9] rounded-b overflow-auto p-6 text-sm text-[#323130]">
        {error ? (
          <p className="text-[#D13438]">{error}</p>
        ) : html === null ? (
          <p className="text-[#605E5C]">Rendering document…</p>
        ) : (
          <div className="prose-outlook" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  )
}

interface AttachmentBarProps {
  attachments: Attachment[]
}

function fileIcon(contentType: string, filename?: string): string {
  if (contentType.startsWith('image/')) return '🖼️'
  if (contentType === 'application/pdf') return '📄'
  if (contentType.includes('word') || filename?.endsWith('.docx') || filename?.endsWith('.doc')) return '📝'
  if (contentType.includes('excel') || contentType.includes('spreadsheet') || filename?.endsWith('.xlsx') || filename?.endsWith('.xls')) return '📊'
  if (contentType.includes('powerpoint') || contentType.includes('presentation')) return '📋'
  if (contentType.includes('zip') || contentType.includes('compressed')) return '🗜️'
  return '📎'
}

function isExcelFile(contentType: string, filename: string): boolean {
  return contentType.includes('spreadsheet') || contentType.includes('excel') ||
    filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')
}

function isWordFile(contentType: string, filename: string): boolean {
  return contentType.includes('word') || filename.endsWith('.docx') || filename.endsWith('.doc')
}

function isPptxFile(contentType: string, filename: string): boolean {
  return contentType.includes('powerpoint') || contentType.includes('presentation') ||
    filename.endsWith('.pptx') || filename.endsWith('.ppt')
}

function isTextFile(contentType: string, filename: string): boolean {
  return contentType.includes('text') || filename.endsWith('.csv') || filename.endsWith('.txt') ||
    filename.endsWith('.json') || filename.endsWith('.xml') || filename.endsWith('.html')
}

/** Get the app name for "Edit in X desktop app" label */
function getDesktopAppName(contentType: string, filename: string): string {
  if (isExcelFile(contentType, filename)) return 'Excel'
  if (isWordFile(contentType, filename)) return 'Word'
  if (contentType.includes('powerpoint') || contentType.includes('presentation')) return 'PowerPoint'
  return 'Desktop'
}


function AttachmentItem({ att }: { att: Attachment }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) setMenuOpen(false)
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
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    setMenuOpen(false)
  }

  const handleEditInBrowser = async () => {
    // Open preview in the browser (same as Preview for demo)
    await handlePreview()
  }

  const handleEditDesktop = async () => {
    // Download the file, then open it with the OS default app
    const url = await fetchBlob()
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = att.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      showNotification(`"${att.filename}" downloaded — open it in ${getDesktopAppName(att.content_type, att.filename)} to edit`)
    }
    setMenuOpen(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(att.filename)
    showNotification(`Copied "${att.filename}" to clipboard`)
    setMenuOpen(false)
  }

  // Cleanup blob URL
  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [blobUrl])

  const icon = fileIcon(att.content_type, att.filename)
  const appName = getDesktopAppName(att.content_type, att.filename)

  return (
    <div className="relative flex items-center gap-2 bg-white border border-[#EDEBE9] rounded px-2.5 py-1.5 hover:border-[#D2D0CE] transition-colors group">
      <span className="text-base leading-none" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#323130] truncate max-w-[140px]">{att.filename}</p>
        <p className="text-[10px] text-[#605E5C]">{formatFileSize(att.size_bytes)}</p>
      </div>

      {/* ── Preview modal ──────────────────────────────────────── */}
      {previewOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50" onClick={() => setPreviewOpen(false)}>
          <div
            className="bg-white rounded-lg shadow-outlook-lg w-[90vw] max-w-5xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#EDEBE9] bg-[#FAF9F8]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{icon}</span>
                <span className="text-sm font-medium text-[#323130] truncate">{att.filename}</span>
                <span className="text-xs text-[#605E5C]">({formatFileSize(att.size_bytes)})</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={handleDownload} className="text-xs text-[#0078D4] hover:underline flex items-center gap-1">
                  <Download size={12} /> Download
                </button>
                <button onClick={() => setPreviewOpen(false)} className="text-[#605E5C] hover:text-[#323130] p-1 rounded hover:bg-[#EDEBE9]">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-auto bg-[#FAF9F8]">
              {blobUrl && att.content_type.startsWith('image/') ? (
                <div className="flex items-center justify-center p-4 h-full">
                  <img src={blobUrl} alt={att.filename} className="max-w-full max-h-[70vh] object-contain rounded" />
                </div>
              ) : blobUrl && att.content_type === 'application/pdf' ? (
                <iframe src={blobUrl} className="w-full h-[75vh] border-0" title={att.filename} />
              ) : blobUrl && isExcelFile(att.content_type, att.filename) ? (
                <ExcelPreview blobUrl={blobUrl} filename={att.filename} />
              ) : blobUrl && isTextFile(att.content_type, att.filename) ? (
                <FileTextPreview blobUrl={blobUrl} filename={att.filename} />
              ) : blobUrl && isWordFile(att.content_type, att.filename) ? (
                <WordPreview blobUrl={blobUrl} filename={att.filename} />
              ) : blobUrl && isPptxFile(att.content_type, att.filename) ? (
                <PptxPreview blobUrl={blobUrl} filename={att.filename} />
              ) : (
                <div className="text-center py-16">
                  <span className="text-5xl mb-4 block">{icon}</span>
                  <p className="text-sm font-medium text-[#323130] mb-1">{att.filename}</p>
                  <p className="text-xs text-[#605E5C] mb-4">{formatFileSize(att.size_bytes)} — {att.content_type}</p>
                  <button onClick={handleDownload} className="text-sm text-[#0078D4] hover:underline flex items-center gap-1 mx-auto">
                    <Download size={13} /> Download to view
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Dropdown chevron ───────────────────────────────────── */}
      <div>
        <button
          ref={btnRef}
          onClick={(e) => {
            e.stopPropagation()
            if (!menuOpen && btnRef.current) {
              const rect = btnRef.current.getBoundingClientRect()
              setMenuPos({ top: rect.bottom + 4, left: Math.max(rect.right - 200, 8) })
            }
            setMenuOpen((v) => !v)
          }}
          aria-label={`Options for ${att.filename}`}
          className="text-[#605E5C] hover:text-[#323130] p-0.5 rounded hover:bg-[#EDEBE9] transition-colors"
        >
          <ChevronDown size={12} />
        </button>

        {menuOpen && (
          <div ref={menuRef} className="fixed z-[200] w-[200px] bg-white border border-[#EDEBE9] rounded-lg shadow-outlook-lg py-1 animate-fade-in" style={{ top: menuPos.top, left: menuPos.left }}>
            <button
              onClick={(e) => { e.stopPropagation(); handlePreview() }}
              className="w-full flex items-center gap-3 text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors"
            >
              <Eye size={16} className="text-[#0078D4] flex-shrink-0" /> Preview
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleEditInBrowser() }}
              className="w-full flex items-center gap-3 text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors"
            >
              <Globe size={16} className="text-[#605E5C] flex-shrink-0" /> Edit in Browser
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleEditDesktop() }}
              className="w-full flex items-center gap-3 text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors"
            >
              <Monitor size={16} className="text-[#605E5C] flex-shrink-0" /> Edit in {appName} desktop app
            </button>
            <button
              disabled
              className="w-full flex items-center gap-3 text-left text-sm text-[#A19F9D] px-3 py-2 cursor-not-allowed"
            >
              <Cloud size={16} className="flex-shrink-0" /> Save to OneDrive
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy() }}
              className="w-full flex items-center gap-3 text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors"
            >
              <Copy size={16} className="text-[#605E5C] flex-shrink-0" /> Copy
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload() }}
              className="w-full flex items-center gap-3 text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors"
            >
              <Download size={16} className="text-[#605E5C] flex-shrink-0" /> Download
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
      className="bg-[#FAF9F8] px-4 py-2"
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