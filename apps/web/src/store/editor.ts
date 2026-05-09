/**
 * Global editor ref store — allows the ribbon toolbar to control the TipTap editor.
 * The RichTextEditor registers its instance here; ComposeMessageRibbon reads it.
 */
import { create } from 'zustand'
import type { Editor } from '@tiptap/react'

interface Signature { id: string; name: string; body_html: string; is_default_new?: boolean }

// Sensitivity labels — display names ("General", "Public", "Confidential",
// "Highly Confidential") match Outlook's Tags group; the four internal
// values keep the existing API contract.
export type Sensitivity = 'normal' | 'personal' | 'private' | 'confidential'

// Encrypt is a separate Outlook control (not a sensitivity option). The
// dropdown mirrors what real Outlook's "Set permission on this item" menu
// surfaces: tenant-specific Confidential presets, Do Not Forward, the
// generic Encrypt-Only, and a "no permission set" reset. Anything other
// than 'none' makes the DLP engine receive sensitivity_label='encrypt' so
// the ENCRYPT_LABEL_SET rule fires.
export type EncryptMode =
  | 'none'
  | 'company_confidential'
  | 'company_confidential_view_only'
  | 'do_not_forward'
  | 'encrypt_only'

interface EditorStore {
  editor: Editor | null
  setEditor: (editor: Editor | null) => void

  // Compose actions exposed for the ribbon
  onAttach: (() => void) | null
  setOnAttach: (fn: (() => void) | null) => void
  triggerAttach: () => void

  onDiscard: (() => void) | null
  setOnDiscard: (fn: (() => void) | null) => void

  importance: 'low' | 'normal' | 'high'
  setImportance: (v: 'low' | 'normal' | 'high') => void

  sensitivity: Sensitivity
  setSensitivity: (v: Sensitivity) => void

  encryptMode: EncryptMode
  setEncryptMode: (v: EncryptMode) => void

  // Follow-up reminder (Boomerang) — ISO datetime when to surface a
  // reminder if no reply received. Null = no reminder.
  boomerangAt: string | null
  setBoomerangAt: (v: string | null) => void

  signatures: Signature[]
  setSignatures: (sigs: Signature[]) => void
  selectedSignatureId: string | null
  setSelectedSignatureId: (id: string | null) => void
  onInsertSignature: ((sigId: string) => void) | null
  setOnInsertSignature: (fn: ((sigId: string) => void) | null) => void
  onRemoveSignature: (() => void) | null
  setOnRemoveSignature: (fn: (() => void) | null) => void
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),

  onAttach: null,
  setOnAttach: (fn) => set({ onAttach: fn }),
  triggerAttach: () => get().onAttach?.(),

  onDiscard: null,
  setOnDiscard: (fn) => set({ onDiscard: fn }),

  importance: 'normal',
  setImportance: (v) => set({ importance: v }),

  sensitivity: 'normal',
  setSensitivity: (v) => set({ sensitivity: v }),

  encryptMode: 'none',
  setEncryptMode: (v) => set({ encryptMode: v }),

  boomerangAt: null,
  setBoomerangAt: (v) => set({ boomerangAt: v }),

  signatures: [],
  setSignatures: (sigs) => set({ signatures: sigs }),
  selectedSignatureId: null,
  setSelectedSignatureId: (id) => set({ selectedSignatureId: id }),
  onInsertSignature: null,
  setOnInsertSignature: (fn) => set({ onInsertSignature: fn }),
  onRemoveSignature: null,
  setOnRemoveSignature: (fn) => set({ onRemoveSignature: fn }),
}))