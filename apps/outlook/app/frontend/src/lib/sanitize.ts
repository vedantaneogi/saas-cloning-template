/**
 * HTML sanitizer for any string we render via `dangerouslySetInnerHTML`.
 *
 * Three rendering call sites depend on this:
 * - ReadingPane.tsx — email body_html received from another user
 * - AttachmentBar.tsx — DOCX/RTF preview converted to HTML by mammoth
 * - Groups.tsx — group message body_html
 *
 * §2 of the universal acceptance criteria forbids unsafe rendering of
 * user-controlled HTML. DOMPurify strips `<script>`, inline event handlers
 * (`onerror`, `onload`, …), and `javascript:` URLs. We keep formatting
 * tags (b/i/u/strong/em/a/img/table/tr/td/th/p/div/span/h1-6/blockquote/
 * pre/code/ul/ol/li/br/hr) so legitimate mail layouts render unchanged.
 */
import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'span',
  'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'tr', 'u', 'ul',
]

const ALLOWED_ATTR = [
  // Generic
  'href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel',
  // Table layout (older HTML emails + mammoth DOCX/RTF output)
  'colspan', 'rowspan', 'width', 'height', 'border', 'align', 'valign',
  'bgcolor', 'cellpadding', 'cellspacing',
]

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // TipTap mention spans render as `<span data-type="mention"
    // data-id="alice@acme.com">@Alice</span>`. The backend reads these
    // to auto-Cc the mentioned user; the reading-pane click handler
    // reads them to open the contact card. Keep the data-attrs through
    // sanitization so both flows survive.
    ADD_DATA_URI_TAGS: [],
    ALLOW_DATA_ATTR: true,
    // Reject every `javascript:` / `data:` / `vbscript:` URL on hrefs/srcs.
    ALLOWED_URI_REGEXP: /^(?:https?|mailto|cid|tel|sms):/i,
  })
}
