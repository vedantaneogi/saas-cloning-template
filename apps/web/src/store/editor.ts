/**
 * Global editor ref store — allows the ribbon toolbar to control the TipTap editor.
 * The RichTextEditor registers its instance here; ComposeMessageRibbon reads it.
 */
import { create } from 'zustand'
import type { Editor } from '@tiptap/react'

interface Signature { id: string; name: string; body_html: string; is_default_new?: boolean }

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

  signatures: [],
  setSignatures: (sigs) => set({ signatures: sigs }),
  selectedSignatureId: null,
  setSelectedSignatureId: (id) => set({ selectedSignatureId: id }),
  onInsertSignature: null,
  setOnInsertSignature: (fn) => set({ onInsertSignature: fn }),
  onRemoveSignature: null,
  setOnRemoveSignature: (fn) => set({ onRemoveSignature: fn }),
}))