'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { messages, signatures } from '@/lib/api'
import { useUIStore } from '@/store/ui'
import { useAuthStore } from '@/store/auth'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

export function ComposeModal({ open, onClose }: ComposeModalProps) {
  const router = useRouter()
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
  const [scheduledSendAt, setScheduledSendAt] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scheduleMenuRef = useRef<HTMLDivElement>(null)
  const sigMenuRef = useRef<HTMLDivElement>(null)
  const sensitivityMenuRef = useRef<HTMLDivElement>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: signatureList = [] } = useQuery({
    queryKey: ['signatures'],
    queryFn: () => signatures.list(),
  })

  // Apply default signature for new messages
  useEffect(() => {
    if (!composerDraft.replyType && signatureList.length > 0) {
      const defaultSig = signatureList.find((s) => s.is_default_new) ?? signatureList[0]
      if (defaultSig && !bodyHtml.includes('<!-- sig -->')) {
        const sigBlock = `<br/><br/><!-- sig -->${defaultSig.body_html}`
        setBodyHtml((prev) => `${prev}${sigBlock}`)
        setSelectedSignature(defaultSig.id)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signatureList])

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
      } else if (draft) {
        showNotification('Draft saved')
      } else {
        showNotification('Message sent')
        router.push('/mail/sent')
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

  // Auto-save draft every 30s
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (subject || bodyHtml || to.length > 0) {
        sendMutation.mutate({ draft: true })
      }
    }, 30000)
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current)
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

  if (minimized) {
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

      {/* Pre-send sensitivity warning dialog */}
      {sensitivityWarningPending !== false && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="sensitivity-warning-title"
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 rounded-t"
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
      )}
    </div>
  )
}
