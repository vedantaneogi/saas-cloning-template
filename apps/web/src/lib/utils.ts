import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMessageDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const date = parseISO(dateStr)
    if (isToday(date)) {
      return format(date, 'h:mm a')
    }
    if (isYesterday(date)) {
      return 'Yesterday'
    }
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 7) {
      return format(date, 'EEE')
    }
    if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'MMM d')
    }
    return format(date, 'MM/dd/yy')
  } catch {
    return ''
  }
}

export function formatFullDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy h:mm a')
  } catch {
    return ''
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '...'
}

/**
 * Strip quoted reply blocks from an HTML email body so thread messages
 * don't repeat the entire prior conversation. Removes:
 * - <blockquote> elements (standard HTML reply quoting)
 * - Elements matching "On ... wrote:" attribution lines + their siblings
 * - Gmail/Outlook-style div.gmail_quote, div[id^="divRplyFwdMsg"]
 */
export function trimQuotedReply(html: string): string {
  if (!html) return html
  // Parser only runs client-side
  if (typeof window === 'undefined') return html
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // Remove blockquote elements (the most common quoting method)
  doc.querySelectorAll('blockquote').forEach((el) => el.remove())

  // Remove Gmail quote divs
  doc.querySelectorAll('div.gmail_quote, div.gmail_extra').forEach((el) => el.remove())

  // Remove Outlook reply header divs
  doc.querySelectorAll(
    'div[id^="divRplyFwdMsg"], div[id^="x_divRplyFwdMsg"], hr[id^="stopSpelling"]'
  ).forEach((el) => {
    // Also remove everything after the hr/div separator
    let next = el.nextSibling
    while (next) {
      const toRemove = next
      next = next.nextSibling
      toRemove.parentNode?.removeChild(toRemove)
    }
    el.remove()
  })

  // Remove "On <date>, <name> wrote:" lines (plain text in <p> or standalone)
  doc.querySelectorAll('p, div').forEach((el) => {
    if (/^On .+ wrote:?\s*$/i.test(el.textContent?.trim() ?? '')) {
      el.remove()
    }
  })

  return doc.body.innerHTML
}
