'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { messages, signatures, dlp } from '@/lib/api'
import type { DlpResult } from '@/lib/api'
import { useUIStore } from '@/store/ui'
import { useAuthStore } from '@/store/auth'
import { useEditorStore } from '@/store/editor'
import { RecipientField } from './RecipientField'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Button } from '@/components/ui/Button'
import {
  X,
  Minus,
  Maximize2,
  Paperclip,
  Send,
  ChevronDown,
  AlertCircle,
  FileText,
  Clock,
  ShieldAlert,
  Table,
  Image,
  Link,
  Smile,
  PencilLine,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const COMPOSE_TABS = ['Message', 'Insert', 'Format text', 'Draw', 'Options'] as const
type ComposeTab = (typeof COMPOSE_TABS)[number]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const schema = z.object({
  subject: z.string(),
})

type FormValues = z.infer<typeof schema>

interface ComposeModalProps {
  open: boolean
  onClose: () => void
  inline?: boolean
}

export function ComposeModal({ open, onClose, inline = false }: ComposeModalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const composerDraft = useUIStore((s) => s.composerDraft)
  const setComposerDraft = useUIStore((s) => s.setComposerDraft)
  const showNotification = useUIStore((s) => s.showNotification)
  const currentUser = useAuthStore((s) => s.currentUser)
  const queryClient = useQueryClient()

  const [to, setTo] = useState<string[]>(composerDraft.to)
  const [cc, setCc] = useState<string[]>(composerDraft.cc)
  const [bcc, setBcc] = useState<string[]>(composerDraft.bcc)
  const [bodyHtml, setBodyHtml] = useState(composerDraft.bodyHtml || '')
  const [showCc, setShowCc] = useState(cc.length > 0)
  const [showBcc, setShowBcc] = useState(bcc.length > 0)
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [sigMenuOpen, setSigMenuOpen] = useState(false)
  const [scheduleMenuOpen, setScheduleMenuOpen] = useState(false)
  const [importance, setImportance] = useState<'low' | 'normal' | 'high'>('normal')
  const [sensitivityMenuOpen, setSensitivityMenuOpen] = useState(false)
  const [sensitivity, setSensitivity] = useState<'normal' | 'personal' | 'private' | 'confidential'>('normal')
  const [sensitivityWarningPending, setSensitivityWarningPending] = useState<false | 'send' | { scheduled: string }>(false)
  const [dlpViolations, setDlpViolations] = useState<string[]>([])
  // Live DLP — re-evaluated by debounced effect below.
  const [dlpLive, setDlpLive] = useState<DlpResult | null>(null)
  const [dlpExpanded, setDlpExpanded] = useState(false)
  // Attachment-intent: pending = the user mentioned "attached" but staged
  // no files; once dismissed (clicked "Send anyway") we don't re-prompt
  // for the same compose session.
  const [attachmentIntentPending, setAttachmentIntentPending] = useState<false | 'send' | { scheduled: string }>(false)
  const [attachmentIntentDismissed, setAttachmentIntentDismissed] = useState(false)
  const [scheduledSendAt, setScheduledSendAt] = useState<string>('')
  const [composeTab, setComposeTab] = useState<ComposeTab>('Message')
  const [showInsertLink, setShowInsertLink] = useState(false)
  const [insertLinkUrl, setInsertLinkUrl] = useState('')
  const [insertLinkText, setInsertLinkText] = useState('')
  const imageInsertRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scheduleMenuRef = useRef<HTMLDivElement>(null)
  const sigMenuRef = useRef<HTMLDivElement>(null)
  const sensitivityMenuRef = useRef<HTMLDivElement>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: signatureList = [] } = useQuery({
    queryKey: ['signatures'],
    queryFn: () => signatures.list(),
  })

  // Apply default signature for new messages — use ref to prevent double insertion
  const sigInsertedRef = useRef(false)
  useEffect(() => {
    if (sigInsertedRef.current) return
    if (!composerDraft.replyType && signatureList.length > 0) {
      const defaultSig = signatureList.find((s) => s.is_default_new) ?? signatureList[0]
      if (defaultSig) {
        sigInsertedRef.current = true
        const sigBlock = `<br/><br/><!-- sig -->${defaultSig.body_html}`
        setBodyHtml((prev) => {
          if (prev.includes('<!-- sig -->')) return prev
          return `${prev}${sigBlock}`
        })
        setSelectedSignature(defaultSig.id)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signatureList])

  // Register compose callbacks so ribbon can control attach, signature, importance, discard
  const setOnAttach = useEditorStore((s) => s.setOnAttach)
  const setOnDiscard = useEditorStore((s) => s.setOnDiscard)
  const setStoreImportance = useEditorStore((s) => s.setImportance)
  const setStoreSignatures = useEditorStore((s) => s.setSignatures)
  const setStoreSelectedSigId = useEditorStore((s) => s.setSelectedSignatureId)
  const setOnInsertSignature = useEditorStore((s) => s.setOnInsertSignature)
  const setOnRemoveSignature = useEditorStore((s) => s.setOnRemoveSignature)

  useEffect(() => {
    if (!inline) return
    setOnAttach(() => fileInputRef.current?.click())
    setOnDiscard(() => onClose())
    return () => { setOnAttach(null); setOnDiscard(null) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inline])

  // Re-register signature callbacks whenever dependencies change (avoids stale closures)
  useEffect(() => {
    if (!inline) return
    setOnInsertSignature((sigId: string) => insertSignature(sigId))
    setOnRemoveSignature(() => removeSignature())
    return () => { setOnInsertSignature(null); setOnRemoveSignature(null) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inline, signatureList, bodyHtml, selectedSignature])

  // Sync importance and signatures to store for ribbon access
  useEffect(() => {
    if (inline) setStoreImportance(importance)
  }, [inline, importance, setStoreImportance])

  useEffect(() => {
    if (inline) setStoreSignatures(signatureList)
  }, [inline, signatureList, setStoreSignatures])

  useEffect(() => {
    if (inline) setStoreSelectedSigId(selectedSignature)
  }, [inline, selectedSignature, setStoreSelectedSigId])

  // Listen for importance changes from ribbon
  const storeImportance = useEditorStore((s) => s.importance)
  useEffect(() => {
    if (inline && storeImportance !== importance) setImportance(storeImportance)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeImportance])

  const { register, handleSubmit, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: composerDraft.subject },
  })

  const subject = watch('subject')

  const sendMutation = useMutation({
    mutationFn: async ({ draft, scheduled }: { draft: boolean; scheduled?: string }) => {
      const data = {
        to_addresses: to.map((t) => {
          const m = t.match(/^(.+)\s<(.+)>$/)
          return m ? { name: m[1].trim(), email: m[2] } : { email: t }
        }),
        cc_addresses: cc.map((t) => {
          const m = t.match(/^(.+)\s<(.+)>$/)
          return m ? { name: m[1].trim(), email: m[2] } : { email: t }
        }),
        bcc_addresses: bcc.map((t) => {
          const m = t.match(/^(.+)\s<(.+)>$/)
          return m ? { name: m[1].trim(), email: m[2] } : { email: t }
        }),
        subject,
        body_html: bodyHtml,
        is_draft: draft,
        importance,
        sensitivity,
        in_reply_to_id: composerDraft.replyToMessageId,
        reply_type: (composerDraft.replyType ?? 'none') as 'none' | 'reply' | 'reply_all' | 'forward',
        ...(scheduled ? { scheduled_send_at: new Date(scheduled).toISOString() } : {}),
      }
      const msg = await messages.create(data)
      if (attachedFiles.length > 0) {
        await Promise.all(attachedFiles.map((f) => messages.uploadAttachment(msg.id, f)))
      }
      return { msg, draft, scheduled }
    },
    onSuccess: ({ draft, scheduled }) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      if (scheduled) {
        showNotification('Message scheduled')
        // Park the user in the Scheduled folder so they can find / edit /
        // cancel the queued message — landing on Sent (the immediate-send
        // behaviour) was misleading because the message hasn't shipped yet.
        if (pathname?.startsWith('/mail')) {
          router.push('/mail/scheduled')
        }
      } else if (draft) {
        showNotification('Draft saved')
      } else {
        showNotification('Message sent')
        // Stay put on /groups (and any other surface that owns its own
        // inbox view); only kick the user to Sent from the mail flow.
        if (pathname?.startsWith('/mail')) {
          router.push('/mail/sent')
        }
      }
      onClose()
    },
  })

  // Close sig menu on outside click
  useEffect(() => {
    if (!sigMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (sigMenuRef.current && !sigMenuRef.current.contains(e.target as Node)) {
        setSigMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sigMenuOpen])

  // Close schedule menu on outside click
  useEffect(() => {
    if (!scheduleMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (scheduleMenuRef.current && !scheduleMenuRef.current.contains(e.target as Node)) {
        setScheduleMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [scheduleMenuOpen])

  // Close sensitivity menu on outside click
  useEffect(() => {
    if (!sensitivityMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (sensitivityMenuRef.current && !sensitivityMenuRef.current.contains(e.target as Node)) {
        setSensitivityMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sensitivityMenuOpen])

  const insertSignature = (sigId: string) => {
    const sig = signatureList.find((s) => s.id === sigId)
    if (!sig) return
    // Remove any currently inserted signature, then append new one
    const sigMarker = '<!-- sig -->'
    const base = bodyHtml.includes(sigMarker)
      ? bodyHtml.substring(0, bodyHtml.indexOf(sigMarker)).trimEnd()
      : bodyHtml
    setBodyHtml(`${base}<br/><br/>${sigMarker}${sig.body_html}`)
    setSelectedSignature(sigId)
    setSigMenuOpen(false)
  }

  const removeSignature = () => {
    const sigMarker = '<!-- sig -->'
    if (bodyHtml.includes(sigMarker)) {
      setBodyHtml(bodyHtml.substring(0, bodyHtml.indexOf(sigMarker)).trimEnd())
    }
    setSelectedSignature(null)
    setSigMenuOpen(false)
  }

  // Auto-save draft — only after 2 min of inactivity, and only if user typed real content
  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    const hasRealContent = subject || to.length > 0 || (bodyHtml && !bodyHtml.match(/^(<br\/?>|\s|<!-- sig -->.*)*$/))
    if (!hasRealContent) return
    autoSaveRef.current = setTimeout(() => {
      sendMutation.mutate({ draft: true })
    }, 120000) // 2 minutes
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, bodyHtml, to])

  const SENSITIVITY_OPTIONS = [
    { value: 'normal', label: 'Normal', description: 'No restrictions' },
    { value: 'personal', label: 'Personal', description: 'Personal message' },
    { value: 'private', label: 'Private', description: 'Do not forward' },
    { value: 'confidential', label: 'Confidential', description: 'Handle with care' },
  ] as const

  const SENSITIVITY_COLORS: Record<string, string> = {
    normal: '',
    personal: '#0078D4',
    private: '#8B5CF6',
    confidential: '#D13438',
  }

  const requiresWarning = sensitivity === 'private' || sensitivity === 'confidential'

  // Live DLP — debounced 500ms after the user stops typing / changing
  // recipients. Backend rules also re-check on send so a malicious client
  // can't bypass.
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const labelMap: Record<string, 'public' | 'internal' | 'confidential' | 'encrypt'> = {
          normal: 'public',
          personal: 'internal',
          private: 'confidential',
          confidential: 'confidential',
        }
        const result = await dlp.evaluate({
          to: to.map((t) => {
            const m = t.match(/^(.+)\s<(.+)>$/)
            return m ? { email: m[2], name: m[1].trim() } : { email: t }
          }),
          cc: cc.map((t) => {
            const m = t.match(/^(.+)\s<(.+)>$/)
            return m ? { email: m[2], name: m[1].trim() } : { email: t }
          }),
          bcc: bcc.map((t) => {
            const m = t.match(/^(.+)\s<(.+)>$/)
            return m ? { email: m[2], name: m[1].trim() } : { email: t }
          }),
          subject,
          body: bodyHtml,
          attachments: attachedFiles.map((f) => ({ name: f.name })),
          sensitivity_label: labelMap[sensitivity] ?? 'public',
        })
        setDlpLive(result)
      } catch {
        // Soft-fail — never let a DLP error block the editor; the send-time
        // re-check is the source of truth.
      }
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, cc, bcc, subject, bodyHtml, sensitivity, attachedFiles.length])

  const scanForSensitiveContent = (text: string): string[] => {
    const warnings: string[] = []
    const plainText = text.replace(/<[^>]+>/g, ' ')
    // Credit card patterns (Visa, Mastercard, Amex)
    if (/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/.test(plainText)) {
      warnings.push('Message may contain credit card numbers')
    }
    // SSN pattern
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(plainText)) {
      warnings.push('Message may contain Social Security numbers')
    }
    // Password patterns
    if (/\b(?:password|passwd|pwd)\s*[:=]\s*\S+/i.test(plainText)) {
      warnings.push('Message may contain passwords')
    }
    // Bank account
    if (/\b(?:account\s*(?:number|#|no)?)\s*[:=]?\s*\d{8,17}\b/i.test(plainText)) {
      warnings.push('Message may contain bank account numbers')
    }
    return warnings
  }

  const handleSend = (scheduled?: string) => {
    // Guard against empty recipients — applies to immediate AND scheduled
    // sends. Schedule path used to skip this and silently dispatch a message
    // with nobody on it.
    if (to.length === 0 && cc.length === 0 && bcc.length === 0) {
      showNotification('Add at least one recipient before sending')
      return
    }

    // DLP block — server enforces too, but bail early so the user gets a
    // clear message rather than a generic 403.
    if (dlpLive?.status === 'block') {
      const lines = dlpLive.policy_tips
        .filter((t) => t.action === 'block')
        .map((t) => t.message)
      showNotification(lines.join(' • ') || 'DLP policy blocks this message.')
      return
    }

    // "Did you forget the attachment?" — body or subject hints at one but
    // none is staged. Failure-Mode #3 from the CSV. The check is skipped
    // once the user explicitly OKs the warning (attachmentIntentDismissed).
    if (!attachmentIntentDismissed && attachedFiles.length === 0) {
      const probe = `${subject} ${bodyHtml}`
        .replace(/<[^>]+>/g, ' ')
        .toLowerCase()
      // Word-boundary regex so "attach" / "attaching" / "attached" / etc all
      // hit, including "resume" and "cv" which strongly imply a file is meant
      // to be enclosed.
      const trigger = /\b(attach(ed|ment|ments|ing|s)?|enclos(ed|ing)|please find|see attached|herewith|resume|cv|spreadsheet|deck|slides|pdf|docx?|xlsx?)\b/i
      if (trigger.test(probe)) {
        setAttachmentIntentPending(scheduled ? { scheduled } : 'send')
        return
      }
    }

    // DLP content scanning — runs on every send
    const contentWarnings = scanForSensitiveContent(bodyHtml + ' ' + subject)
    const violations: string[] = [...contentWarnings]

    const senderDomain = currentUser?.email?.split('@')[1] ?? ''
    const allRecipients = [...to, ...cc, ...bcc]
    const externalRecipients = senderDomain
      ? allRecipients.filter((r) => {
          const domain = r.split('@')[1] ?? ''
          return domain && domain !== senderDomain
        })
      : []

    if (requiresWarning || contentWarnings.length > 0) {
      if (externalRecipients.length > 0 && sensitivity === 'confidential') {
        violations.push(`Sending to ${externalRecipients.length} external recipient${externalRecipients.length !== 1 ? 's' : ''} outside ${senderDomain}`)
      }
      if (attachedFiles.length > 0 && sensitivity === 'confidential') {
        violations.push(`${attachedFiles.length} attachment${attachedFiles.length !== 1 ? 's' : ''} will be sent without encryption`)
      }
      if (externalRecipients.length > 0 && contentWarnings.length > 0) {
        violations.push(`Sending sensitive content to ${externalRecipients.length} external recipient${externalRecipients.length !== 1 ? 's' : ''}`)
      }
      if (violations.length > 0) {
        setDlpViolations(violations)
        setSensitivityWarningPending(scheduled ? { scheduled } : 'send')
        return
      }
    }

    sendMutation.mutate({ draft: false, ...(scheduled ? { scheduled } : {}) })
  }

  if (!open) return null

  if (!inline && minimized) {
    return (
      <div className="fixed bottom-0 right-6 z-50 w-80">
        <div
          className="bg-[#0078D4] text-white text-sm px-3 py-2 rounded-t flex items-center justify-between cursor-pointer shadow-outlook"
          onClick={() => setMinimized(false)}
        >
          <span className="truncate font-medium">{subject || 'New Message'}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setMinimized(false) }}
              aria-label="Restore"
              className="hover:bg-white/20 rounded p-0.5"
            >
              <Maximize2 size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose() }}
              aria-label="Close"
              className="hover:bg-white/20 rounded p-0.5"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Pre-send guard dialogs — sensitivity / DLP and attachment-intent. Shared
  // between the inline and popup compose so the inline path also gets them.
  const sensitivityDialog = sensitivityWarningPending !== false ? (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sensitivity-warning-title"
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 rounded-t"
    >
      <div className="bg-white rounded shadow-outlook-lg mx-4 p-5 max-w-xs w-full">
        <div className="flex items-start gap-3 mb-3">
          <ShieldAlert size={20} style={{ color: SENSITIVITY_COLORS[sensitivity] }} className="flex-shrink-0 mt-0.5" />
          <div>
            <h3 id="sensitivity-warning-title" className="text-sm font-semibold text-[#323130]">
              Send {sensitivity} message?
            </h3>
            <p className="text-xs text-[#605E5C] mt-1">
              {sensitivity === 'confidential'
                ? 'This message is marked Confidential. Recipients should handle it with strict discretion.'
                : 'This message is marked Private. Please ensure recipients are authorised before sending.'}
            </p>
          </div>
        </div>
        {dlpViolations.length > 0 && (
          <div className="mb-3 bg-[#FFF4CE] border border-[#F7C948] rounded px-3 py-2">
            <p className="text-xs font-semibold text-[#7A5900] mb-1">DLP policy warnings</p>
            <ul className="space-y-0.5">
              {dlpViolations.map((v, i) => (
                <li key={i} className="text-xs text-[#7A5900] flex items-start gap-1">
                  <span className="flex-shrink-0 mt-0.5">⚠</span> {v}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setSensitivityWarningPending(false)}
            className="text-sm text-[#605E5C] px-3 py-1.5 hover:bg-[#EDEBE9] rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const pending = sensitivityWarningPending
              setSensitivityWarningPending(false)
              if (pending === 'send') {
                sendMutation.mutate({ draft: false })
              } else if (typeof pending === 'object') {
                sendMutation.mutate({ draft: false, scheduled: pending.scheduled })
              }
            }}
            className="text-sm font-medium text-white px-3 py-1.5 rounded transition-colors"
            style={{ backgroundColor: SENSITIVITY_COLORS[sensitivity] }}
          >
            Send anyway
          </button>
        </div>
      </div>
    </div>
  ) : null

  const attachmentIntentDialog = attachmentIntentPending !== false ? (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="attachment-intent-title"
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 rounded-t"
    >
      <div className="bg-white rounded shadow-outlook-lg mx-4 p-5 max-w-xs w-full">
        <h3 id="attachment-intent-title" className="text-sm font-semibold text-[#323130] mb-1">
          Did you forget to attach a file?
        </h3>
        <p className="text-xs text-[#605E5C] mb-4">
          Your message mentions an attachment but no files are attached.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setAttachmentIntentPending(false)}
            className="text-sm text-[#605E5C] px-3 py-1.5 hover:bg-[#EDEBE9] rounded transition-colors"
          >
            Add attachment
          </button>
          <button
            type="button"
            onClick={() => {
              const pending = attachmentIntentPending
              setAttachmentIntentPending(false)
              setAttachmentIntentDismissed(true)
              if (pending === 'send') handleSend()
              else if (typeof pending === 'object') handleSend(pending.scheduled)
            }}
            className="text-sm font-medium text-white bg-[#0078D4] hover:bg-[#106EBE] px-3 py-1.5 rounded transition-colors"
          >
            Send anyway
          </button>
        </div>
      </div>
    </div>
  ) : null

  // Inline mode — renders inside the reading pane with no modal wrapper
  if (inline) {
    return (
      <div className="flex flex-col h-full bg-white relative" aria-label="Compose message">
        {/* Send bar — sits flush at the top of the pane like Outlook's compose,
            with a heavier Send button + chevron for Schedule send. */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-3 border-b border-[#EDEBE9] flex-shrink-0">
          <div className="flex items-center flex-shrink-0">
            <button
              type="button"
              onClick={handleSubmit(() => handleSend())}
              disabled={sendMutation.isPending}
              className="flex items-center gap-2 bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-50 text-white text-sm font-semibold pl-3 pr-3 h-8 rounded-l transition-colors"
            >
              <Send size={14} /> Send
            </button>
            <div className="relative" ref={scheduleMenuRef}>
              <button type="button" onClick={() => setScheduleMenuOpen((v) => !v)}
                aria-label="Schedule send"
                className="flex items-center bg-[#0078D4] hover:bg-[#106EBE] text-white h-8 px-1.5 rounded-r border-l border-white/30 transition-colors">
                <ChevronDown size={12} />
              </button>
              {scheduleMenuOpen && (
                <div className="absolute left-0 top-full mt-0.5 z-50 w-64 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg p-3">
                  <p className="text-xs font-medium text-[#605E5C] mb-2">Schedule send</p>
                  <input type="datetime-local" value={scheduledSendAt} onChange={(e) => setScheduledSendAt(e.target.value)}
                    className="w-full text-xs border border-[#EDEBE9] rounded px-2 py-1 mb-2 focus:outline-none focus:ring-1 focus:ring-[#0078D4]" />
                  <button type="button" disabled={!scheduledSendAt || (to.length === 0 && cc.length === 0 && bcc.length === 0)} onClick={() => { handleSend(scheduledSendAt); setScheduleMenuOpen(false) }}
                    className="w-full text-xs bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded">Schedule</button>
                </div>
              )}
            </div>
          </div>
          {/* Right-side header utilities — sensitivity tag + Discard (trash)
              icon on the far right, matching Outlook's compose toolbar. */}
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {sensitivity !== 'normal' && (
              <span
                className="text-[11px] px-2 py-0.5 rounded border"
                style={{
                  color: SENSITIVITY_COLORS[sensitivity],
                  borderColor: SENSITIVITY_COLORS[sensitivity],
                  backgroundColor: 'white',
                }}
              >
                {sensitivity === 'confidential' ? 'Confidential' : sensitivity === 'private' ? 'Private' : 'Personal'}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (confirm('Discard this message?')) onClose()
              }}
              aria-label="Discard message"
              title="Discard"
              className="p-1.5 rounded text-[#605E5C] hover:bg-[#FDE7E9] hover:text-[#D13438] transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* DLP policy-tip banner — shows the most-severe matched rule above
            the To field while composing. Block status uses red, encrypt uses
            blue, warn uses yellow. */}
        {dlpLive && dlpLive.status !== 'allow' && dlpLive.policy_tips.length > 0 && (() => {
          const top = dlpLive.policy_tips[0]
          const toneFor = (action: string) =>
            action === 'block' ? { bg: '#FDE7E9', fg: '#A4262C', icon: '#D13438', label: 'Block' }
            : action === 'encrypt' ? { bg: '#EFF6FC', fg: '#0E5C9C', icon: '#0078D4', label: 'Encrypt' }
            : action === 'warn' ? { bg: '#FFF4CE', fg: '#7A5900', icon: '#C19C00', label: 'Warn' }
            : { bg: '#F3F2F1', fg: '#323130', icon: '#605E5C', label: 'Info' }
          const tone = toneFor(dlpLive.status)
          const extra = dlpLive.policy_tips.length - 1
          return (
            <div
              role="status"
              className="mx-4 mt-2 mb-1 px-3 py-2 rounded border flex items-start gap-2 text-xs"
              style={{ backgroundColor: tone.bg, borderColor: tone.fg, color: tone.fg }}
            >
              <ShieldAlert size={14} style={{ color: tone.icon }} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">
                  Policy tip: {top.message}
                </p>
                {extra > 0 && !dlpExpanded && (
                  <button
                    type="button"
                    onClick={() => setDlpExpanded(true)}
                    className="mt-0.5 underline opacity-80 hover:opacity-100"
                  >
                    +{extra} more rule{extra > 1 ? 's' : ''} triggered — view all
                  </button>
                )}
                {dlpExpanded && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                        All matched rules ({dlpLive.policy_tips.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => setDlpExpanded(false)}
                        className="text-[11px] underline opacity-80 hover:opacity-100"
                      >
                        Hide
                      </button>
                    </div>
                    <ul className="space-y-1">
                      {dlpLive.policy_tips.map((tip) => {
                        const t = toneFor(tip.action)
                        return (
                          <li
                            key={tip.rule_id}
                            className="flex items-start gap-2 px-2 py-1.5 rounded border bg-white"
                            style={{ borderColor: t.fg, color: t.fg }}
                          >
                            <span
                              className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{ backgroundColor: t.fg, color: '#fff' }}
                            >
                              {t.label}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="font-mono text-[10px] opacity-70 mr-1">{tip.rule_id}</span>
                              {tip.message}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
              <a
                href="https://learn.microsoft.com/en-us/microsoft-365/compliance/dlp-policy-tips-reference"
                target="_blank"
                rel="noreferrer"
                className="hover:underline whitespace-nowrap"
              >
                Learn more
              </a>
            </div>
          )
        })()}

        {/* Recipients — each field on its own row with a button-style label prefix
            ("To"/"Cc"/"Bcc"), Bcc toggle on the right of the To row. Mirrors the
            Outlook compose markup. The bottom underline lives inside RecipientField
            so it sits flush against the chips, like Outlook's compose. */}
        <div className="flex flex-col flex-shrink-0">
          <div className="flex items-start gap-2 px-4 pt-1.5">
            <div className="flex-1 min-w-0">
              <RecipientField label="To" id="inline-to" value={to} onChange={setTo} placeholder="" />
            </div>
            {!showBcc && (
              <button
                type="button"
                onClick={() => setShowBcc(true)}
                // Same persistent outlined chip as the To/Cc labels.
                className="text-sm text-[#323130] bg-white border border-[#D2D0CE] hover:bg-[#F3F2F1] hover:border-[#A19F9D] rounded px-3 py-1 flex-shrink-0 mt-1"
              >
                Bcc
              </button>
            )}
          </div>

          {/* Cc — always visible to match Outlook's default compose */}
          <div className="px-4 pt-1.5">
            <RecipientField label="Cc" id="inline-cc" value={cc} onChange={setCc} placeholder="" />
          </div>

          {showBcc && (
            <div className="px-4 pt-1.5">
              <RecipientField label="Bcc" id="inline-bcc" value={bcc} onChange={setBcc} placeholder="" />
            </div>
          )}

          {/* Subject — own row with its own underline so the field reads as distinct. */}
          <div className="flex items-center gap-2 px-4 pt-1.5 pb-1.5 border-b border-[#E1DFDD] mx-0">
            <input
              type="text"
              placeholder="Add a subject"
              aria-label="Subject"
              className="flex-1 text-sm text-[#323130] placeholder:text-[#A19F9D] focus:outline-none py-1"
              {...register('subject')}
            />
            {importance === 'high' && (
              <span className="text-xs font-bold text-[#D13438] px-1.5 py-0.5 rounded flex-shrink-0 bg-[#FDE7E9]">High importance</span>
            )}
            {importance === 'low' && (
              <span className="text-xs font-medium text-[#0078D4] px-1.5 py-0.5 rounded flex-shrink-0 bg-[#EBF3FB]">Low importance</span>
            )}
          </div>
        </div>

        {/* Body editor */}
        <div className="flex-1 overflow-hidden min-h-0">
          <RichTextEditor
            content={bodyHtml}
            onChange={setBodyHtml}
            placeholder="Write your message..."
            minHeight="180px"
            className="border-0 rounded-none h-full"
            hideToolbar
            registerGlobal
          />
        </div>

        {/* Attached files */}
        {attachedFiles.length > 0 && (
          <div className="px-4 py-2 border-t border-[#EDEBE9] flex flex-wrap gap-2 bg-[#FAF9F8] flex-shrink-0">
            {attachedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-1.5 bg-white border border-[#EDEBE9] rounded px-2 py-1 text-xs text-[#323130]">
                <FileText size={12} className="text-[#0078D4] flex-shrink-0" />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button type="button" onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))} className="text-[#605E5C] hover:text-[#D13438] ml-0.5">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input for ribbon attach button */}
        <input ref={fileInputRef} type="file" multiple className="hidden"
          onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) setAttachedFiles((prev) => [...prev, ...files]); e.target.value = '' }} />

        {/* Pre-send guard dialogs — also shown in popup mode below. */}
        {sensitivityDialog}
        {attachmentIntentDialog}
      </div>
    )
  }

  return (
    <div
      role="dialog"
      aria-label="New message"
      aria-modal="true"
      className="fixed bottom-0 right-6 z-50 w-[560px] max-h-[80vh] flex flex-col bg-white shadow-outlook-lg rounded-t border border-[#EDEBE9] animate-fade-in"
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0078D4] rounded-t flex-shrink-0">
        <h2 className="text-sm font-medium text-white truncate">
          {subject || 'New Message'}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            aria-label="Minimize"
            className="text-white hover:bg-white/20 rounded p-0.5 transition-colors"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => sendMutation.mutate({ draft: true })}
            aria-label="Save draft and close"
            className="text-white hover:bg-white/20 rounded p-0.5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Compose ribbon tabs — matches Outlook compose window */}
      <div className="flex items-center h-7 bg-white border-b border-[#EDEBE9] px-1 flex-shrink-0" role="tablist" aria-label="Compose tabs">
        {COMPOSE_TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={composeTab === tab}
            onClick={() => setComposeTab(tab)}
            className={cn(
              'px-2.5 h-7 text-[11px] transition-colors relative',
              composeTab === tab
                ? 'text-[#0078D4] font-semibold after:absolute after:bottom-0 after:left-0.5 after:right-0.5 after:h-[2px] after:bg-[#0078D4] after:rounded-t'
                : 'text-[#323130] hover:bg-[#F3F2F1]',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab-specific toolbar */}
      {composeTab === 'Insert' && (
        <div className="border-b border-[#EDEBE9] bg-white flex-shrink-0">
          <div className="flex items-center h-9 px-2 gap-1">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-[11px] text-[#323130] hover:bg-[#F3F2F1] px-2 py-1 rounded transition-colors">
              <Paperclip size={13} /> Attach file
            </button>
            <div className="w-px h-5 bg-[#EDEBE9]" />
            <button type="button" onClick={() => {
              const table = '<table style="border-collapse:collapse;width:100%"><tr><td style="border:1px solid #EDEBE9;padding:6px">Cell 1</td><td style="border:1px solid #EDEBE9;padding:6px">Cell 2</td></tr><tr><td style="border:1px solid #EDEBE9;padding:6px">Cell 3</td><td style="border:1px solid #EDEBE9;padding:6px">Cell 4</td></tr></table><br/>'
              setBodyHtml((prev) => {
                const sigIdx = prev.indexOf('<!-- sig -->')
                if (sigIdx > -1) return prev.slice(0, sigIdx) + table + prev.slice(sigIdx)
                return prev + table
              })
            }} className="flex items-center gap-1 text-[11px] text-[#323130] hover:bg-[#F3F2F1] px-2 py-1 rounded transition-colors">
              <Table size={13} /> Table
            </button>
            <button type="button" onClick={() => imageInsertRef.current?.click()} className="flex items-center gap-1 text-[11px] text-[#323130] hover:bg-[#F3F2F1] px-2 py-1 rounded transition-colors">
              <Image size={13} /> Pictures
            </button>
            <button type="button" onClick={() => setShowInsertLink(true)} className="flex items-center gap-1 text-[11px] text-[#323130] hover:bg-[#F3F2F1] px-2 py-1 rounded transition-colors">
              <Link size={13} /> Link
            </button>
            <div className="w-px h-5 bg-[#EDEBE9]" />
            <button type="button" onClick={() => {
              setBodyHtml((prev) => {
                const sigIdx = prev.indexOf('<!-- sig -->')
                const emoji = '😊'
                if (sigIdx > -1) return prev.slice(0, sigIdx) + emoji + prev.slice(sigIdx)
                return prev + emoji
              })
            }} className="flex items-center gap-1 text-[11px] text-[#323130] hover:bg-[#F3F2F1] px-2 py-1 rounded transition-colors">
              <Smile size={13} /> Emoji
            </button>
          </div>

          {/* Insert link inline dialog */}
          {showInsertLink && (
            <div className="px-3 py-2 border-t border-[#EDEBE9] bg-[#FAF9F8] space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#605E5C] w-14">Display:</span>
                <input type="text" value={insertLinkText} onChange={(e) => setInsertLinkText(e.target.value)}
                  placeholder="Text to display" className="flex-1 text-xs border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4] text-[#323130]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#605E5C] w-14">URL:</span>
                <input autoFocus type="url" value={insertLinkUrl} onChange={(e) => setInsertLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && insertLinkUrl.trim()) {
                      const text = insertLinkText.trim() || insertLinkUrl
                      setBodyHtml((prev) => {
                        const link = `<a href="${insertLinkUrl}">${text}</a> `
                        const sigIdx = prev.indexOf('<!-- sig -->')
                        if (sigIdx > -1) return prev.slice(0, sigIdx) + link + prev.slice(sigIdx)
                        return prev + link
                      })
                      setShowInsertLink(false); setInsertLinkUrl(''); setInsertLinkText('')
                    }
                    if (e.key === 'Escape') { setShowInsertLink(false); setInsertLinkUrl(''); setInsertLinkText('') }
                  }}
                  placeholder="https://..." className="flex-1 text-xs border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4] text-[#323130]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-14" />
                <button type="button" onClick={() => {
                  if (insertLinkUrl.trim()) {
                    const text = insertLinkText.trim() || insertLinkUrl
                    setBodyHtml((prev) => {
                      const link = `<a href="${insertLinkUrl}">${text}</a> `
                      const sigIdx = prev.indexOf('<!-- sig -->')
                      if (sigIdx > -1) return prev.slice(0, sigIdx) + link + prev.slice(sigIdx)
                      return prev + link
                    })
                  }
                  setShowInsertLink(false); setInsertLinkUrl(''); setInsertLinkText('')
                }} className="text-xs bg-[#0078D4] text-white px-3 py-1 rounded hover:bg-[#106EBE] transition-colors">Insert</button>
                <button type="button" onClick={() => { setShowInsertLink(false); setInsertLinkUrl(''); setInsertLinkText('') }}
                  className="text-xs text-[#605E5C] px-2 py-1 hover:bg-[#EDEBE9] rounded transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Hidden image input for Pictures button */}
          <input ref={imageInsertRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => {
              const img = `<img src="${reader.result as string}" style="max-width:100%" /><br/>`
              setBodyHtml((prev) => {
                const sigIdx = prev.indexOf('<!-- sig -->')
                if (sigIdx > -1) return prev.slice(0, sigIdx) + img + prev.slice(sigIdx)
                return prev + img
              })
            }
            reader.readAsDataURL(file)
            e.target.value = ''
          }} />
        </div>
      )}
      {composeTab === 'Draw' && (
        <div className="flex items-center h-9 px-2 gap-1 border-b border-[#EDEBE9] bg-white flex-shrink-0">
          <button type="button" className="flex items-center gap-1 text-[11px] text-[#323130] hover:bg-[#F3F2F1] px-2 py-1 rounded transition-colors">
            <PencilLine size={13} /> Draw with touch
          </button>
          <span className="text-[11px] text-[#A19F9D] px-2">Drawing tools are not available in this version</span>
        </div>
      )}
      {composeTab === 'Options' && (
        <div className="flex items-center h-9 px-2 gap-1 border-b border-[#EDEBE9] bg-white flex-shrink-0 relative">
          <button type="button"
            onClick={() => setImportance(importance === 'high' ? 'normal' : 'high')}
            className={cn('flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors',
              importance === 'high' ? 'text-[#D13438] bg-[#FDE7E9]' : 'text-[#323130] hover:bg-[#F3F2F1]')}>
            <AlertCircle size={13} /> High importance
          </button>
          <button type="button"
            onClick={() => setImportance(importance === 'low' ? 'normal' : 'low')}
            className={cn('flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors',
              importance === 'low' ? 'text-[#0078D4] bg-[#EBF3FB]' : 'text-[#323130] hover:bg-[#F3F2F1]')}>
            <ChevronDown size={13} /> Low importance
          </button>
          <div className="w-px h-5 bg-[#EDEBE9]" />
          <div className="relative">
            <button type="button"
              onClick={() => setSensitivityMenuOpen((v) => !v)}
              className={cn('flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors',
                sensitivity !== 'normal' ? 'text-[#0078D4] bg-[#EBF3FB]' : 'text-[#323130] hover:bg-[#F3F2F1]')}>
              <ShieldAlert size={13} /> Sensitivity{sensitivity !== 'normal' ? `: ${sensitivity}` : ''}
            </button>
            {sensitivityMenuOpen && (
              <div className="absolute left-0 top-full mt-0.5 z-50 w-48 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in">
                {(['normal', 'personal', 'private', 'confidential'] as const).map((opt) => (
                  <button key={opt} type="button"
                    onClick={() => { setSensitivity(opt); setSensitivityMenuOpen(false) }}
                    className={cn('w-full text-left text-xs px-3 py-2 hover:bg-[#F3F2F1] transition-colors flex items-center justify-between',
                      sensitivity === opt ? 'text-[#0078D4] font-medium' : 'text-[#323130]')}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    {sensitivity === opt && <span className="w-2 h-2 rounded-full bg-[#0078D4]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="w-px h-5 bg-[#EDEBE9]" />
          <button type="button"
            onClick={() => showNotification('Tracking options not available')}
            className="flex items-center gap-1 text-[11px] text-[#323130] hover:bg-[#F3F2F1] px-2 py-1 rounded transition-colors">
            <Clock size={13} /> Delay delivery
          </button>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit(() => handleSend())}
        className="flex flex-col flex-1 overflow-hidden"
      >
        {/* Recipients */}
        <div className="px-3 pt-2 space-y-1 border-b border-[#EDEBE9] pb-2 flex-shrink-0">
          <RecipientField
            label="To"
            id="compose-to"
            value={to}
            onChange={setTo}
            placeholder="Recipients"
          />

          {(!showCc || !showBcc) && (
            <div className="flex justify-end gap-2">
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="text-xs text-[#0078D4] hover:underline"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  className="text-xs text-[#0078D4] hover:underline"
                >
                  Bcc
                </button>
              )}
            </div>
          )}

          {showCc && (
            <RecipientField
              label="Cc"
              id="compose-cc"
              value={cc}
              onChange={setCc}
            />
          )}
          {showBcc && (
            <RecipientField
              label="Bcc"
              id="compose-bcc"
              value={bcc}
              onChange={setBcc}
            />
          )}

          {/* Subject */}
          <div className="flex items-center gap-2 border-b border-[#EDEBE9] pb-1">
            <label htmlFor="compose-subject" className="text-sm text-[#605E5C] w-8 text-right flex-shrink-0">
              Subj
            </label>
            <input
              id="compose-subject"
              type="text"
              placeholder="Add a subject"
              aria-label="Subject"
              className="flex-1 text-sm text-[#323130] placeholder:text-[#A19F9D] focus:outline-none py-0.5"
              {...register('subject')}
            />
            {importance === 'high' && (
              <span className="text-xs font-bold text-[#D13438] px-1.5 py-0.5 rounded flex-shrink-0 bg-[#FDE7E9]">
                High importance
              </span>
            )}
            {importance === 'low' && (
              <span className="text-xs font-medium text-[#0078D4] px-1.5 py-0.5 rounded flex-shrink-0 bg-[#EBF3FB]">
                Low importance
              </span>
            )}
            {sensitivity !== 'normal' && (
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ color: SENSITIVITY_COLORS[sensitivity], backgroundColor: `${SENSITIVITY_COLORS[sensitivity]}18` }}
              >
                {sensitivity.charAt(0).toUpperCase() + sensitivity.slice(1)}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden min-h-0">
          <RichTextEditor
            content={bodyHtml}
            onChange={setBodyHtml}
            placeholder="Write your message..."
            minHeight="180px"
            className="border-0 rounded-none h-full"
          />
        </div>

        {/* Attached files */}
        {attachedFiles.length > 0 && (
          <div className="px-3 py-2 border-t border-[#EDEBE9] flex flex-wrap gap-2 bg-[#FAF9F8] flex-shrink-0">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 bg-white border border-[#EDEBE9] rounded px-2 py-1 text-xs text-[#323130]"
              >
                <FileText size={12} className="text-[#0078D4] flex-shrink-0" />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <span className="text-[#A19F9D]">({formatFileSize(file.size)})</span>
                <button
                  type="button"
                  onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label={`Remove ${file.name}`}
                  className="text-[#605E5C] hover:text-[#D13438] ml-0.5"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#EDEBE9] flex-shrink-0 bg-[#FAF9F8]">
          <div className="flex items-center gap-1">
            <button
              type="submit"
              disabled={sendMutation.isPending}
              data-automation-id="ComposeSendButton"
              aria-label="Send message"
              className="flex items-center gap-1.5 bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-l transition-colors"
            >
              <Send size={13} />
              Send
            </button>
            {/* Schedule send */}
            <div className="relative" ref={scheduleMenuRef}>
              <button
                type="button"
                aria-label="Schedule send"
                aria-expanded={scheduleMenuOpen}
                aria-haspopup="menu"
                onClick={() => setScheduleMenuOpen((v) => !v)}
                className="flex items-center bg-[#0078D4] hover:bg-[#106EBE] text-white text-sm font-medium px-2 py-1.5 rounded-r border-l border-[#006CBF] transition-colors"
              >
                <ChevronDown size={12} />
              </button>
              {scheduleMenuOpen && (
                <div
                  role="menu"
                  className="absolute bottom-9 left-0 z-50 w-64 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg animate-fade-in p-3"
                >
                  <p className="text-xs font-medium text-[#605E5C] mb-2">Schedule send</p>
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-[#605E5C] flex-shrink-0" />
                    <input
                      type="datetime-local"
                      aria-label="Schedule send date and time"
                      value={scheduledSendAt}
                      onChange={(e) => setScheduledSendAt(e.target.value)}
                      className="flex-1 text-xs border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!scheduledSendAt || to.length === 0 || sendMutation.isPending}
                    onClick={() => {
                      handleSend(scheduledSendAt)
                      setScheduleMenuOpen(false)
                    }}
                    aria-label="Send at scheduled time"
                    className="mt-2 w-full text-xs bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded transition-colors"
                  >
                    Schedule send
                  </button>
                </div>
              )}
            </div>
            <div className="w-px h-5 bg-[#D2D0CE] mx-1" />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              aria-hidden="true"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                if (files.length) setAttachedFiles((prev) => [...prev, ...files])
                e.target.value = ''
              }}
            />
            <button
              type="button"
              aria-label="Attach file"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-[#605E5C] hover:bg-[#EDEBE9] rounded transition-colors"
            >
              <Paperclip size={16} />
            </button>

            {signatureList.length > 0 && (
              <div className="relative" ref={sigMenuRef}>
                <button
                  type="button"
                  aria-label="Insert signature"
                  aria-expanded={sigMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setSigMenuOpen((v) => !v)}
                  className={cn(
                    'p-1.5 hover:bg-[#EDEBE9] rounded transition-colors flex items-center gap-0.5 text-xs',
                    selectedSignature ? 'text-[#0078D4]' : 'text-[#605E5C]'
                  )}
                >
                  Signature
                  <ChevronDown size={10} />
                </button>
                {sigMenuOpen && (
                  <div
                    role="menu"
                    className="absolute bottom-8 left-0 z-50 w-48 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg animate-fade-in"
                  >
                    {signatureList.map((sig) => (
                      <button
                        key={sig.id}
                        type="button"
                        role="menuitem"
                        onClick={() => insertSignature(sig.id)}
                        className={cn(
                          'w-full text-left text-sm px-3 py-2 hover:bg-[#F3F2F1] transition-colors flex items-center justify-between gap-2',
                          selectedSignature === sig.id ? 'text-[#0078D4]' : 'text-[#323130]'
                        )}
                      >
                        <span className="truncate">{sig.name}</span>
                        {selectedSignature === sig.id && (
                          <span className="text-[9px] text-[#0078D4] flex-shrink-0">Active</span>
                        )}
                      </button>
                    ))}
                    {selectedSignature && (
                      <>
                        <div className="h-px bg-[#EDEBE9]" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={removeSignature}
                          className="w-full text-left text-sm text-[#605E5C] px-3 py-2 hover:bg-[#F3F2F1] transition-colors"
                        >
                          Remove signature
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Importance toggle */}
            <button
              type="button"
              aria-label="High importance"
              aria-pressed={importance === 'high'}
              title="Set high importance"
              onClick={() => setImportance(importance === 'high' ? 'normal' : 'high')}
              className={cn(
                'p-1.5 rounded transition-colors text-sm font-bold w-7 h-7 flex items-center justify-center',
                importance === 'high' ? 'text-[#D13438] bg-[#FDE7E9]' : 'text-[#605E5C] hover:bg-[#EDEBE9]'
              )}
            >
              !
            </button>
            <button
              type="button"
              aria-label="Low importance"
              aria-pressed={importance === 'low'}
              title="Set low importance"
              onClick={() => setImportance(importance === 'low' ? 'normal' : 'low')}
              className={cn(
                'p-1.5 rounded transition-colors w-7 h-7 flex items-center justify-center',
                importance === 'low' ? 'text-[#0078D4] bg-[#EBF3FB]' : 'text-[#605E5C] hover:bg-[#EDEBE9]'
              )}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 3v7M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            {/* Sensitivity picker */}
            <div className="relative" ref={sensitivityMenuRef}>
              <button
                type="button"
                aria-label="Set sensitivity"
                aria-expanded={sensitivityMenuOpen}
                aria-haspopup="menu"
                onClick={() => setSensitivityMenuOpen((v) => !v)}
                title="Set sensitivity label"
                className={cn(
                  'p-1.5 hover:bg-[#EDEBE9] rounded transition-colors',
                  sensitivity !== 'normal' ? '' : 'text-[#605E5C]'
                )}
                style={sensitivity !== 'normal' ? { color: SENSITIVITY_COLORS[sensitivity] } : {}}
              >
                <ShieldAlert size={15} />
              </button>
              {sensitivityMenuOpen && (
                <div
                  role="menu"
                  className="absolute bottom-9 right-0 z-50 w-52 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg animate-fade-in py-1"
                >
                  <div className="px-3 py-1 text-xs font-semibold text-[#605E5C] border-b border-[#EDEBE9] mb-1">
                    Sensitivity
                  </div>
                  {SENSITIVITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="menuitem"
                      onClick={() => { setSensitivity(opt.value); setSensitivityMenuOpen(false) }}
                      className={cn(
                        'w-full text-left px-3 py-2 hover:bg-[#F3F2F1] transition-colors flex items-center justify-between gap-2'
                      )}
                    >
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: opt.value !== 'normal' ? SENSITIVITY_COLORS[opt.value] : '#323130' }}
                        >
                          {opt.label}
                        </p>
                        <p className="text-xs text-[#A19F9D]">{opt.description}</p>
                      </div>
                      {sensitivity === opt.value && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#0078D4]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {sendMutation.isError && (
              <span className="text-xs text-[#D13438] flex items-center gap-1">
                <AlertCircle size={12} />
                Failed to send
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Discard message"
              className="text-xs text-[#605E5C] hover:text-[#323130] px-2 py-1 hover:bg-[#EDEBE9] rounded transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      </form>

      {/* Pre-send guard dialogs — same JSX as the inline path. */}
      {sensitivityDialog}
      {attachmentIntentDialog}
    </div>
  )
}
