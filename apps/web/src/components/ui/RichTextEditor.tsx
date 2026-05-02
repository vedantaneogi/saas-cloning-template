'use client'

import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Mention from '@tiptap/extension-mention'
import { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Undo,
  Redo,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { contacts } from '@/lib/api'
import type { Contact } from '@/lib/api'

// ── Mention suggestion list component ─────────────────────────────────────────
interface MentionListProps extends SuggestionProps {
  items: Contact[]
}

const MentionList = forwardRef<{ onKeyDown: (p: SuggestionKeyDownProps) => boolean }, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }: SuggestionKeyDownProps) {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          const item = items[selectedIndex]
          if (item) command({ id: item.email, label: item.display_name })
          return true
        }
        return false
      },
    }))

    if (items.length === 0) return null

    return (
      <div className="bg-white border border-[#EDEBE9] rounded shadow-lg py-1 min-w-[200px] max-h-48 overflow-y-auto z-50">
        {items.map((item, i) => (
          <button
            key={item.id}
            onClick={() => command({ id: item.email, label: item.display_name })}
            className={cn(
              'flex flex-col w-full text-left px-3 py-1.5 text-sm transition-colors',
              i === selectedIndex ? 'bg-[#EBF3FB] text-[#0078D4]' : 'text-[#323130] hover:bg-[#F3F2F1]'
            )}
          >
            <span className="font-medium">{item.display_name}</span>
            <span className="text-xs text-[#605E5C]">{item.email}</span>
          </button>
        ))}
      </div>
    )
  }
)
MentionList.displayName = 'MentionList'

// ── Mention extension config ───────────────────────────────────────────────────
const mentionSuggestion = {
  items: async ({ query }: { query: string }) => {
    if (!query) return []
    try {
      return await contacts.autocomplete(query)
    } catch {
      return []
    }
  },
  render: () => {
    let component: ReactRenderer<{ onKeyDown: (p: SuggestionKeyDownProps) => boolean }, MentionListProps>
    let popup: TippyInstance[]

    return {
      onStart: (props: SuggestionProps) => {
        component = new ReactRenderer(MentionList, { props: props as MentionListProps, editor: props.editor })
        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },
      onUpdate: (props: SuggestionProps) => {
        component.updateProps(props as MentionListProps)
        popup[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect })
      },
      onKeyDown: (props: SuggestionKeyDownProps) => {
        if (props.event.key === 'Escape') { popup[0]?.hide(); return true }
        return component.ref?.onKeyDown(props) ?? false
      },
      onExit: () => {
        popup[0]?.destroy()
        component.destroy()
      },
    }
  },
}

interface RichTextEditorProps {
  content?: string
  onChange?: (html: string) => void
  placeholder?: string
  minHeight?: string
  className?: string
  readOnly?: boolean
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'p-1.5 rounded transition-colors text-[#323130] hover:bg-[#EDEBE9]',
        active && 'bg-[#EDEBE9] text-[#0078D4]',
        disabled && 'opacity-40 pointer-events-none'
      )}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Write your message...',
  minHeight = '200px',
  className,
  readOnly = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-[#0078D4] underline' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Mention.configure({
        HTMLAttributes: { class: 'mention text-[#0078D4] font-medium' },
        suggestion: mentionSuggestion,
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const addImage = () => {
    const url = window.prompt('Enter image URL:')
    if (url && editor) {
      editor.chain().focus().insertContent(`<img src="${url}" class="max-w-full rounded" />`).run()
    }
  }

  if (!editor) return null

  return (
    <div
      className={cn(
        'border border-[#EDEBE9] rounded overflow-hidden tiptap-editor',
        className
      )}
    >
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-[#EDEBE9] bg-[#FAF9F8]">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={14} />
          </ToolbarButton>

          <div className="w-px h-4 bg-[#EDEBE9] mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <List size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered list"
          >
            <ListOrdered size={14} />
          </ToolbarButton>

          <div className="w-px h-4 bg-[#EDEBE9] mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            title="Align left"
          >
            <AlignLeft size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            title="Align center"
          >
            <AlignCenter size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            title="Align right"
          >
            <AlignRight size={14} />
          </ToolbarButton>

          <div className="w-px h-4 bg-[#EDEBE9] mx-1" />

          <ToolbarButton onClick={addLink} title="Insert link">
            <LinkIcon size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={addImage} title="Insert image">
            <ImageIcon size={14} />
          </ToolbarButton>

          <div className="w-px h-4 bg-[#EDEBE9] mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo size={14} />
          </ToolbarButton>
        </div>
      )}
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="text-sm text-[#323130] outlook-scrollbar"
      />
    </div>
  )
}
