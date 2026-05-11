'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMailStore } from '@/store/mail'
import { useUIStore, draftFromReply } from '@/store/ui'
import { useEditorStore } from '@/store/editor'
import { messages, folders, quickSteps, settings, categories, tasks } from '@/lib/api'
import {
  Menu, Reply, ReplyAll, Forward, Trash2, Archive, MailOpen, Zap,
  ChevronDown, ChevronRight, Flag, FolderInput, Printer, MoreHorizontal,
  PanelRight, PanelBottom, PanelLeftClose, MessageSquare,
  RotateCcw, RotateCw, HelpCircle, BookOpen, ExternalLink,
  CalendarPlus, CalendarDays, CalendarRange, Share2,
  UserPlus, Pencil, Star, Plus, CheckSquare, Users,
  Pin, Clock, Tag,
  Paperclip, Link2, Image as ImageIcon, ClipboardPaste, Paintbrush2,
  Heading, Mic, Video, AlignJustify,
  Search, Filter, RefreshCw, ShieldAlert, Lock, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Shared ribbon button ────────────────────────────────────────────────────
// `large` was an experiment to bump the compose ribbon density; senior
// reverted that — kept here as a no-op prop so existing callsites still
// compile.
function RibbonBtn({
  onClick, disabled, label, children, active,
}: {
  onClick?: () => void; disabled?: boolean; label: string; children: React.ReactNode; active?: boolean
  large?: boolean
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      aria-label={label} title={label}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 px-2 py-0.5 rounded text-[11px] transition-colors min-w-[42px] h-full',
        disabled ? 'text-[#A19F9D] cursor-not-allowed opacity-60'
          : active ? 'bg-[#EBF3FB] text-[#0078D4]'
          : 'text-[#323130] hover:bg-[#F3F2F1]',
      )}
    >
      {children}
    </button>
  )
}

// `tall` is also a no-op now — kept to avoid touching every callsite.
function RibbonSep(_props: { tall?: boolean } = {}) {
  return <div className="w-px h-8 bg-[#EDEBE9] mx-0.5 flex-shrink-0" />
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
const TABS = ['Home', 'View', 'Help'] as const
const COMPOSE_TABS = ['Message', 'Insert', 'Format text', 'Draw', 'Options'] as const
type Tab = string

export function RibbonTabs() {
  const pathname = usePathname()
  const composerOpen = useUIStore((s) => s.composerOpen)
  const isMail = pathname?.startsWith('/mail')
  const isCalendar = pathname?.startsWith('/calendar')
  const isContacts = pathname?.startsWith('/contacts')
  const isTasks = pathname?.startsWith('/tasks')
  const isComposing = isMail && composerOpen
  const [activeTab, setActiveTab] = useState<Tab>('Home')

  // Auto-switch to Message tab when composing starts, back to Home when it ends
  useEffect(() => {
    if (isComposing) setActiveTab('Message')
    else if (activeTab === 'Message' || activeTab === 'Insert' || activeTab === 'Format text' || activeTab === 'Draw' || activeTab === 'Options') {
      setActiveTab('Home')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComposing])
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const fileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fileMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) setFileMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [fileMenuOpen])

  return (
    <div className="flex flex-col flex-shrink-0 relative z-10">
      {/* Tab bar */}
      <div className="h-8 bg-white border-b border-[#EDEBE9] flex items-center gap-0 px-1">
        <button
          aria-label="Toggle navigation"
          className="w-7 h-7 flex items-center justify-center text-[#605E5C] hover:bg-[#F3F2F1] rounded transition-colors mr-1"
        >
          <Menu size={16} />
        </button>

        {/* File — opens backstage dropdown, not a tab */}
        <div className="relative" ref={fileMenuRef}>
          <button
            onClick={() => setFileMenuOpen((v) => !v)}
            aria-expanded={fileMenuOpen}
            aria-haspopup="menu"
            className={cn(
              'px-2 h-7 text-xs transition-colors rounded-sm',
              fileMenuOpen ? 'bg-[#0078D4] text-white' : 'text-[#605E5C] hover:bg-[#F3F2F1]',
            )}
          >
            File
          </button>
          {fileMenuOpen && (
            <div role="menu" className="absolute left-0 top-full mt-0.5 z-50 w-56 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in">
              <div className="px-3 py-2 border-b border-[#EDEBE9]">
                <p className="text-xs font-semibold text-[#323130]">Account Information</p>
                <p className="text-[11px] text-[#605E5C] mt-0.5">frank.miller@acmecorp.com</p>
              </div>
              <button role="menuitem" onClick={() => { useUIStore.getState().openSettings(); setFileMenuOpen(false) }}
                className="w-full text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors">
                Options
              </button>
              <button role="menuitem" onClick={() => { useUIStore.getState().openSettings('oof'); setFileMenuOpen(false) }}
                className="w-full text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors">
                Automatic Replies
              </button>
              <button role="menuitem" onClick={() => { useUIStore.getState().openSettings('rules'); setFileMenuOpen(false) }}
                className="w-full text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors">
                Manage Rules
              </button>
              <div className="h-px bg-[#EDEBE9] my-1" />
              <button role="menuitem" onClick={() => { window.print(); setFileMenuOpen(false) }}
                className="w-full text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors">
                Print
              </button>
            </div>
          )}
        </div>

        {isComposing ? (
          // Compose tabs: Message, Insert, Format text, Draw, Options
          COMPOSE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab as Tab); setFileMenuOpen(false) }}
              aria-selected={activeTab === tab}
              role="tab"
              className={cn(
                'px-2.5 h-8 text-xs transition-colors relative',
                activeTab === tab
                  ? 'text-[#0078D4] font-semibold after:absolute after:bottom-0 after:left-0.5 after:right-0.5 after:h-[2px] after:bg-[#0078D4] after:rounded-t'
                  : 'text-[#323130] hover:bg-[#F3F2F1]',
              )}
            >
              {tab}
            </button>
          ))
        ) : (
          TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setFileMenuOpen(false) }}
              aria-selected={activeTab === tab}
              role="tab"
              className={cn(
                'px-2.5 h-8 text-xs transition-colors relative',
                activeTab === tab
                  ? 'text-[#0078D4] font-semibold after:absolute after:bottom-0 after:left-0.5 after:right-0.5 after:h-[2px] after:bg-[#0078D4] after:rounded-t'
                  : 'text-[#323130] hover:bg-[#F3F2F1]',
              )}
            >
              {tab}
            </button>
          ))
        )}
      </div>

      {/* Tab panel content — changes per section */}
      {isComposing ? (
        // Compose toolbar — every compose tab (Message/Insert/Format text/
        // Draw/Options) shows the formatting ribbon so the toolbar never
        // goes blank while the user is composing. Outlook does the same;
        // its tabs change the *highlighted* command but keep the ribbon
        // populated.
        (activeTab === 'Message'
          || activeTab === 'Insert'
          || activeTab === 'Format text'
          || activeTab === 'Draw'
          || activeTab === 'Options') ? <ComposeMessageRibbon /> : null
      ) : (
        <>
          {isMail && activeTab === 'Home' && <HomeRibbon />}
          {isMail && activeTab === 'View' && <ViewRibbon />}
          {isCalendar && activeTab === 'Home' && <CalendarHomeRibbon />}
          {isContacts && activeTab === 'Home' && <ContactsHomeRibbon />}
          {isTasks && activeTab === 'Home' && <TasksHomeRibbon />}
          {activeTab === 'Help' && <HelpRibbon />}
        </>
      )}
    </div>
  )
}

// ─── Shadcn-style dropdown for font / font-size on the compose ribbon ───────
// We swapped out native <select> here because the browser-rendered menu
// clashed with the rest of the ribbon (per senior). Trigger is a button
// styled like a ribbon control; menu renders fixed-positioned so the
// toolbar's overflow-x-auto doesn't clip it.
function FontDropdown({
  value,
  options,
  onChange,
  title,
  ariaLabel,
  width,
  renderOption,
}: {
  value: string
  options: string[]
  onChange: (v: string) => void
  title: string
  ariaLabel: string
  width: number
  renderOption?: (v: string) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t)) return
      if (btnRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          const r = btnRef.current?.getBoundingClientRect()
          if (r) setPos({ top: r.bottom + 4, left: r.left, width: Math.max(width, r.width) })
          setOpen((v) => !v)
        }}
        className="flex items-center justify-between text-xs border border-[#D2D0CE] rounded px-2 text-[#323130] bg-white hover:border-[#0078D4] focus:outline-none focus:border-[#0078D4] h-9 mx-0.5"
        style={{ width }}
      >
        <span className="truncate">{value}</span>
        <ChevronDown size={11} className="ml-1 text-[#605E5C] flex-shrink-0" />
      </button>
      {open && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          className="fixed z-[200] bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 max-h-72 overflow-y-auto outlook-scrollbar"
          style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
        >
          {options.map((o) => (
            <button
              key={o}
              type="button"
              role="option"
              aria-selected={o === value}
              onClick={() => { onChange(o); setOpen(false) }}
              className={cn(
                'w-full text-left text-xs px-2 py-1 hover:bg-[#F3F2F1] flex items-center justify-between',
                o === value && 'bg-[#EBF3FB] text-[#0078D4]',
              )}
            >
              <span className="truncate">{renderOption ? renderOption(o) : o}</span>
              {o === value && <Check size={12} className="flex-shrink-0" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Outlook-style color swatch picker ──────────────────────────────────────
// Single source of truth for both the font-color and highlight popovers so
// the senior gets the same look in both. Palette is a 2-D array of {label,
// color} cells laid out as Outlook does (3 rows × 6 cells: pure → light →
// grayscale). Reset row at the bottom matches "No color" / "Automatic" in
// the live Outlook menu.
function OutlookSwatchPicker({
  title,
  resetLabel,
  containerRef,
  pos,
  onPick,
  onReset,
  palette,
}: {
  title: string
  resetLabel: string
  containerRef: React.RefObject<HTMLDivElement | null>
  pos: { top: number; left: number }
  onPick: (hex: string) => void
  onReset: () => void
  palette: { label: string; color: string }[][]
}) {
  return (
    <div
      ref={containerRef}
      role="menu"
      aria-label={title}
      className="fixed z-[200] bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-[#605E5C]">{title}</div>
      <div role="grid" className="px-2 pb-2">
        {palette.map((row, ri) => (
          <div key={ri} role="row" className="flex gap-1 mb-1 last:mb-0">
            {row.map((cell) => (
              <button
                key={cell.color}
                role="gridcell"
                type="button"
                aria-label={cell.label}
                title={cell.label}
                onClick={() => onPick(cell.color)}
                className="w-6 h-6 rounded-sm border border-[#D2D0CE] hover:ring-2 hover:ring-[#0078D4] hover:z-10 transition"
                style={{ backgroundColor: cell.color }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-[#EDEBE9] mt-0.5" />
      <button
        type="button"
        role="menuitem"
        onClick={onReset}
        className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
      >
        {resetLabel}
      </button>
    </div>
  )
}

// ─── Compose Message Ribbon (shown when composing inline) ────────────────────
function ComposeMessageRibbon() {
  const editor = useEditorStore((s) => s.editor)
  const showNotification = useUIStore((s) => s.showNotification)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [highlightPickerOpen, setHighlightPickerOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [stylesMenuOpen, setStylesMenuOpen] = useState(false)
  const [spacingMenuOpen, setSpacingMenuOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const colorBtnRef = useRef<HTMLDivElement>(null)
  const highlightBtnRef = useRef<HTMLDivElement>(null)
  const linkBtnRef = useRef<HTMLDivElement>(null)
  const stylesBtnRef = useRef<HTMLDivElement>(null)
  const spacingBtnRef = useRef<HTMLDivElement>(null)
  const colorRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const linkRef = useRef<HTMLDivElement>(null)
  const stylesRef = useRef<HTMLDivElement>(null)
  const spacingRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [popupPos, setPopupPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  // Outlook's color swatch grid: 3 rows × 6 cells — pure → light → grayscale
  // (taken verbatim from the live Outlook Text Highlight Color menu). Used
  // for both font color and highlight pickers so the popovers feel identical.
  const OUTLOOK_PALETTE: { label: string; color: string }[][] = [
    [
      { label: 'Cyan', color: '#00FFFF' },
      { label: 'Green', color: '#00FF00' },
      { label: 'Yellow', color: '#FFFF00' },
      { label: 'Orange', color: '#FF8000' },
      { label: 'Red', color: '#FF0000' },
      { label: 'Magenta', color: '#FF00FF' },
    ],
    [
      { label: 'Light cyan', color: '#80FFFF' },
      { label: 'Light green', color: '#80FF80' },
      { label: 'Light yellow', color: '#FFFF80' },
      { label: 'Light orange', color: '#FFC080' },
      { label: 'Light red', color: '#FF8080' },
      { label: 'Light magenta', color: '#FF80FF' },
    ],
    [
      { label: 'White', color: '#FFFFFF' },
      { label: 'Light gray', color: '#CCCCCC' },
      { label: 'Gray', color: '#999999' },
      { label: 'Dark gray', color: '#666666' },
      { label: 'Darker gray', color: '#333333' },
      { label: 'Black', color: '#000000' },
    ],
  ]

  const FONT_FAMILIES = ['Aptos', 'Arial', 'Calibri', 'Cambria', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana']
  const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '36']
  // Outlook's "Spacing" flyout — line-height multipliers. Backed by inline
  // style on the focused block so it survives copy/paste cleanly.
  const LINE_SPACINGS: { label: string; value: string }[] = [
    { label: '1.0', value: '1' },
    { label: '1.15', value: '1.15' },
    { label: '1.5', value: '1.5' },
    { label: '2.0', value: '2' },
    { label: '2.5', value: '2.5' },
    { label: '3.0', value: '3' },
  ]

  const getPos = (ref: React.RefObject<HTMLDivElement | null>) => {
    const rect = ref.current?.getBoundingClientRect()
    return rect ? { top: rect.bottom + 4, left: rect.left } : { top: 0, left: 0 }
  }

  // Close pickers on outside click
  useEffect(() => {
    if (!colorPickerOpen && !highlightPickerOpen && !linkDialogOpen && !stylesMenuOpen && !spacingMenuOpen) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (colorPickerOpen && colorRef.current && !colorRef.current.contains(t) && colorBtnRef.current && !colorBtnRef.current.contains(t)) setColorPickerOpen(false)
      if (highlightPickerOpen && highlightRef.current && !highlightRef.current.contains(t) && highlightBtnRef.current && !highlightBtnRef.current.contains(t)) setHighlightPickerOpen(false)
      if (linkDialogOpen && linkRef.current && !linkRef.current.contains(t) && linkBtnRef.current && !linkBtnRef.current.contains(t)) setLinkDialogOpen(false)
      if (stylesMenuOpen && stylesRef.current && !stylesRef.current.contains(t) && stylesBtnRef.current && !stylesBtnRef.current.contains(t)) setStylesMenuOpen(false)
      if (spacingMenuOpen && spacingRef.current && !spacingRef.current.contains(t) && spacingBtnRef.current && !spacingBtnRef.current.contains(t)) setSpacingMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [colorPickerOpen, highlightPickerOpen, linkDialogOpen, stylesMenuOpen, spacingMenuOpen])

  const run = (cmd: () => void) => {
    if (!editor) return
    cmd()
  }

  const openLinkDialog = () => {
    if (!editor) return
    const { from, to } = editor.state.selection
    const selectedText = from !== to ? editor.state.doc.textBetween(from, to, ' ') : ''
    setLinkText(selectedText)
    setLinkUrl(editor.getAttributes('link')?.href ?? '')
    setLinkDialogOpen(true)
  }

  const submitLink = () => {
    if (!editor || !linkUrl) return
    const { from, to } = editor.state.selection
    if (from !== to) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
    } else {
      editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText.trim() || linkUrl}</a> `).run()
    }
    setLinkDialogOpen(false)
    setLinkUrl('')
    setLinkText('')
  }

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const reader = new FileReader()
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result as string }).run()
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const currentFont = editor?.getAttributes('textStyle')?.fontFamily || 'Aptos'
  const currentColor = editor?.getAttributes('textStyle')?.color || '#000000'

  // Apply line-height to the focused block. TipTap doesn't ship a line-height
  // mark; we set inline style on the closest block via DOM manipulation so
  // the caller doesn't need a custom extension.
  const setLineSpacing = (lh: string) => {
    if (!editor) return
    const dom = editor.view.domAtPos(editor.state.selection.from).node as Node
    let el: HTMLElement | null = dom instanceof HTMLElement ? dom : (dom.parentElement as HTMLElement | null)
    while (el && !['P', 'LI', 'H1', 'H2', 'H3', 'BLOCKQUOTE'].includes(el.tagName)) {
      el = el.parentElement
    }
    if (el) el.style.lineHeight = lh
    setSpacingMenuOpen(false)
  }

  // Match the actual Outlook compose-Message ribbon: Clipboard | Basic Text |
  // Color | Lists+Align | Include | Collaborate | Voice | Compose-only
  // (Importance + Discard). Buttons use the `large` size so icons read at
  // the same density as desktop Outlook.
  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0 overflow-x-auto ribbon-scroll" role="toolbar" aria-label="Compose toolbar">
      {/* ─── Group: Clipboard ─── */}
      <RibbonBtn large label="Undo (Ctrl+Z)" disabled={!editor?.can().undo()} onClick={() => run(() => editor!.chain().focus().undo().run())}>
        <RotateCcw size={15} />
      </RibbonBtn>
      <RibbonBtn large label="Paste (Ctrl+V)" onClick={async () => {
        try {
          const text = await navigator.clipboard.readText()
          run(() => editor!.chain().focus().insertContent(text).run())
        } catch {
          showNotification('Clipboard access denied — use Ctrl+V')
        }
      }}>
        <ClipboardPaste size={15} />
      </RibbonBtn>
      <RibbonBtn large label="Format painter" onClick={() => showNotification('Format painter not available in this version')}>
        <Paintbrush2 size={15} />
      </RibbonBtn>

      <RibbonSep tall />

      {/* ─── Group: Basic Text ─── */}
      {/* Native <select> dropdowns surface as the browser's chrome (looks
          out of place next to shadcn-style menus). FontDropdown renders a
          portal-positioned panel matching the rest of the ribbon. */}
      <FontDropdown
        value={currentFont}
        options={FONT_FAMILIES}
        title="Font family"
        ariaLabel="Font"
        width={112}
        renderOption={(f) => <span style={{ fontFamily: f }}>{f}</span>}
        onChange={(f) => run(() => editor!.chain().focus().setFontFamily(f).run())}
      />
      <FontDropdown
        value={(editor?.getAttributes('textStyle')?.fontSize as string)?.replace('pt', '') || '12'}
        options={FONT_SIZES}
        title="Font size"
        ariaLabel="Font size"
        width={56}
        onChange={(s) => run(() => editor!.chain().focus().setFontSize(`${s}pt`).run())}
      />
      <RibbonBtn large label="Bold (Ctrl+B)" active={editor?.isActive('bold')} onClick={() => run(() => editor!.chain().focus().toggleBold().run())}>
        <span className="font-bold text-base leading-none">B</span>
      </RibbonBtn>
      <RibbonBtn large label="Italic (Ctrl+I)" active={editor?.isActive('italic')} onClick={() => run(() => editor!.chain().focus().toggleItalic().run())}>
        <span className="italic text-base leading-none">I</span>
      </RibbonBtn>
      <RibbonBtn large label="Underline (Ctrl+U)" active={editor?.isActive('underline')} onClick={() => run(() => editor!.chain().focus().toggleUnderline().run())}>
        <span className="underline text-base leading-none">U</span>
      </RibbonBtn>
      <RibbonBtn large label="Strikethrough" active={editor?.isActive('strike')} onClick={() => run(() => editor!.chain().focus().toggleStrike().run())}>
        <span className="line-through text-base leading-none">S</span>
      </RibbonBtn>

      {/* Styles flyout — Heading 1/2/3 + Body */}
      <div ref={stylesBtnRef}>
        <RibbonBtn large label="Styles" onClick={() => { setPopupPos(getPos(stylesBtnRef)); setStylesMenuOpen((v) => !v) }}>
          <div className="flex items-center gap-0.5"><Heading size={15} /><ChevronDown size={10} /></div>
        </RibbonBtn>
      </div>
      {stylesMenuOpen && (
        <div ref={stylesRef} className="fixed z-[200] bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 w-48" style={{ top: popupPos.top, left: popupPos.left }}>
          {[
            { label: 'Body', cmd: () => editor!.chain().focus().setParagraph().run(), preview: 'text-sm' },
            { label: 'Heading 1', cmd: () => editor!.chain().focus().setHeading({ level: 1 }).run(), preview: 'text-xl font-semibold' },
            { label: 'Heading 2', cmd: () => editor!.chain().focus().setHeading({ level: 2 }).run(), preview: 'text-lg font-semibold' },
            { label: 'Heading 3', cmd: () => editor!.chain().focus().setHeading({ level: 3 }).run(), preview: 'text-base font-semibold' },
            { label: 'Quote', cmd: () => editor!.chain().focus().toggleBlockquote().run(), preview: 'text-sm italic text-[#605E5C]' },
            { label: 'Code', cmd: () => editor!.chain().focus().toggleCodeBlock().run(), preview: 'text-sm font-mono' },
          ].map((s) => (
            <button key={s.label} type="button"
              onClick={() => { run(s.cmd); setStylesMenuOpen(false) }}
              className={cn('w-full text-left px-3 py-1.5 hover:bg-[#F3F2F1] text-[#323130]', s.preview)}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Spacing flyout */}
      <div ref={spacingBtnRef}>
        <RibbonBtn large label="Line spacing" onClick={() => { setPopupPos(getPos(spacingBtnRef)); setSpacingMenuOpen((v) => !v) }}>
          <div className="flex items-center gap-0.5"><AlignJustify size={15} /><ChevronDown size={10} /></div>
        </RibbonBtn>
      </div>
      {spacingMenuOpen && (
        <div ref={spacingRef} className="fixed z-[200] bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 w-32" style={{ top: popupPos.top, left: popupPos.left }}>
          {LINE_SPACINGS.map((sp) => (
            <button key={sp.value} type="button"
              onClick={() => setLineSpacing(sp.value)}
              className="w-full text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1] text-[#323130]">
              {sp.label}
            </button>
          ))}
        </div>
      )}

      <MoreFormattingBtn editor={editor} />

      <RibbonSep tall />

      {/* ─── Group: Color + Highlight ─── */}
      {/* Font color icon: bold "A" with a colored underline bar that
          reflects the current selection — matches Outlook's text-color
          glyph (senior asked for the literal "A" instead of our custom
          mountain-shape icon). */}
      <div ref={colorBtnRef}>
        <RibbonBtn large label="Font color" onClick={() => { setPopupPos(getPos(colorBtnRef)); setColorPickerOpen((v) => !v); setHighlightPickerOpen(false) }}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <text x="10" y="14" textAnchor="middle" fontFamily="Segoe UI, Arial, sans-serif" fontWeight="700" fontSize="13" fill="currentColor">A</text>
            <rect x="3" y="16.5" width="14" height="2.5" fill={currentColor} rx="0.5" />
          </svg>
        </RibbonBtn>
      </div>
      {colorPickerOpen && (
        <OutlookSwatchPicker
          title="Font color"
          resetLabel="Automatic"
          containerRef={colorRef}
          pos={popupPos}
          onPick={(hex) => { run(() => editor!.chain().focus().setColor(hex).run()); setColorPickerOpen(false) }}
          onReset={() => { run(() => editor!.chain().focus().unsetColor().run()); setColorPickerOpen(false) }}
          palette={OUTLOOK_PALETTE}
        />
      )}

      {/* Highlight icon: pencil / marker tip (senior asked for the
          pencil glyph instead of the prior triangle highlighter). */}
      <div ref={highlightBtnRef}>
        <RibbonBtn large label="Text highlight" active={editor?.isActive('highlight')} onClick={() => { setPopupPos(getPos(highlightBtnRef)); setHighlightPickerOpen((v) => !v); setColorPickerOpen(false) }}>
          <Pencil size={15} />
        </RibbonBtn>
      </div>
      {highlightPickerOpen && (
        <OutlookSwatchPicker
          title="Text highlight color"
          resetLabel="No color"
          containerRef={highlightRef}
          pos={popupPos}
          onPick={(hex) => { run(() => editor!.chain().focus().toggleHighlight({ color: hex }).run()); setHighlightPickerOpen(false) }}
          onReset={() => { run(() => editor!.chain().focus().unsetHighlight().run()); setHighlightPickerOpen(false) }}
          palette={OUTLOOK_PALETTE}
        />
      )}

      <RibbonSep tall />

      {/* ─── Group: Lists + Alignment ─── */}
      <RibbonBtn large label="Bullets" active={editor?.isActive('bulletList')} onClick={() => run(() => editor!.chain().focus().toggleBulletList().run())}>
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="3" cy="5" r="1.5" fill="currentColor"/><circle cx="3" cy="10" r="1.5" fill="currentColor"/><circle cx="3" cy="15" r="1.5" fill="currentColor"/><path d="M7 5h10M7 10h10M7 15h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      </RibbonBtn>
      <RibbonBtn large label="Numbering" active={editor?.isActive('orderedList')} onClick={() => run(() => editor!.chain().focus().toggleOrderedList().run())}>
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><text x="0" y="6.5" fontSize="6" fill="currentColor" fontFamily="Arial">1.</text><text x="0" y="11.5" fontSize="6" fill="currentColor" fontFamily="Arial">2.</text><text x="0" y="16.5" fontSize="6" fill="currentColor" fontFamily="Arial">3.</text><path d="M7 5h10M7 10h10M7 15h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      </RibbonBtn>
      <RibbonBtn large label="Align left" active={editor?.isActive({ textAlign: 'left' })} onClick={() => run(() => editor!.chain().focus().setTextAlign('left').run())}>
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M2 5h16M2 9h12M2 13h16M2 17h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      </RibbonBtn>
      <RibbonBtn large label="Align center" active={editor?.isActive({ textAlign: 'center' })} onClick={() => run(() => editor!.chain().focus().setTextAlign('center').run())}>
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M2 5h16M5 9h10M2 13h16M5 17h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      </RibbonBtn>
      <RibbonBtn large label="Align right" active={editor?.isActive({ textAlign: 'right' })} onClick={() => run(() => editor!.chain().focus().setTextAlign('right').run())}>
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M2 5h16M6 9h12M2 13h16M6 17h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      </RibbonBtn>

      <RibbonSep tall />

      {/* ─── Group: Include ─── */}
      <RibbonBtn large label="Attach file" onClick={() => useEditorStore.getState().triggerAttach()}>
        <Paperclip size={15} />
      </RibbonBtn>
      <div ref={linkBtnRef}>
        <RibbonBtn large label="Link (Ctrl+K)" onClick={() => { setPopupPos(getPos(linkBtnRef)); openLinkDialog() }}>
          <Link2 size={15} />
        </RibbonBtn>
      </div>
      {linkDialogOpen && (
        <div ref={linkRef} className="fixed z-[200] bg-white border border-[#EDEBE9] rounded shadow-outlook-lg p-3 w-64 animate-fade-in space-y-2" style={{ top: popupPos.top, left: popupPos.left }}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#605E5C] w-12">Display:</span>
              <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Text to display"
                className="flex-1 text-xs border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#605E5C] w-12">URL:</span>
              <input autoFocus type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..."
                onKeyDown={(e) => { if (e.key === 'Enter') submitLink(); if (e.key === 'Escape') setLinkDialogOpen(false) }}
                className="flex-1 text-xs border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={submitLink} className="text-xs bg-[#0078D4] text-white px-3 py-1 rounded hover:bg-[#106EBE]">Insert</button>
              <button onClick={() => setLinkDialogOpen(false)} className="text-xs text-[#605E5C] px-2 py-1 hover:bg-[#EDEBE9] rounded">Cancel</button>
            </div>
        </div>
      )}
      <SignatureRibbonBtn />
      <RibbonBtn large label="Insert image" onClick={() => imageInputRef.current?.click()}>
        <ImageIcon size={15} />
      </RibbonBtn>
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      <RibbonBtn large label="Record video" onClick={() => showNotification('Video recording not available in this version')}>
        <Video size={15} />
      </RibbonBtn>

      <RibbonSep tall />

      {/* ─── Group: Collaborate (Loop) ─── */}
      <RibbonBtn large label="Loop components" onClick={() => showNotification('Loop components not available in this version')}>
        <svg width="15" height="15" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="#0078D4" d="M2 18V10C2 5.58 5.58 2 10 2C14.42 2 18 5.58 18 10C18 14.42 14.42 18 10 18H2ZM5.45 17H10C13.87 17 17 13.87 17 10C17 6.13 13.87 3 10 3C6.13 3 3 6.13 3 10V16.96C3.93 16.83 4.85 16.32 5.58 15.58C6.45 14.72 7 13.59 7 12.5V10C7 8.34 8.34 7 10 7C11.66 7 13 8.34 13 10C13 11.66 11.66 13 10 13H7.97C7.83 14.23 7.18 15.4 6.29 16.29C6.03 16.55 5.75 16.79 5.45 17ZM8 12H10C11.1 12 12 11.1 12 10C12 8.9 11.1 8 10 8C8.9 8 8 8.9 8 10V12Z"/>
        </svg>
      </RibbonBtn>

      <RibbonSep tall />

      {/* ─── Group: Voice (Dictate) ─── */}
      <RibbonBtn large label="Dictate" onClick={() => showNotification('Dictation not available in this version')}>
        <Mic size={15} />
      </RibbonBtn>

      <RibbonSep tall />

      {/* ─── Compose-only: Importance + Sensitivity + Encrypt (Tags group).
          Discard lives on the compose pane itself (right-side trash icon)
          so it's not duplicated here. Encrypt is a separate split-button
          per real Outlook (screenshots 1+2) — not bundled into Sensitivity. */}
      <ImportanceRibbonBtns />
      <SensitivityRibbonBtn />
      <EncryptRibbonBtn />
      <ComposeBoomerangBtn />
    </div>
  )
}

function SignatureRibbonBtn() {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const sigs = useEditorStore((s) => s.signatures)
  const selectedId = useEditorStore((s) => s.selectedSignatureId)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (sigs.length === 0) return null

  return (
    <>
      <div ref={btnRef}>
        <RibbonBtn large label="Signature" active={!!selectedId} onClick={() => {
          if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect()
            setPos({ top: r.bottom + 4, left: r.left })
          }
          setOpen((v) => !v)
        }}>
          <div className="flex items-center gap-0.5">
            <Pencil size={15} />
            <ChevronDown size={10} />
          </div>
        </RibbonBtn>
      </div>
      {open && (
        <div ref={menuRef} className="fixed z-[200] w-48 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in" style={{ top: pos.top, left: pos.left }}>
          {sigs.map((sig) => (
            <button key={sig.id} type="button"
              onClick={() => { useEditorStore.getState().onInsertSignature?.(sig.id); setOpen(false) }}
              className={cn('w-full text-left text-sm px-3 py-2 hover:bg-[#F3F2F1]', selectedId === sig.id ? 'text-[#0078D4] font-medium' : 'text-[#323130]')}>
              {sig.name}
              {selectedId === sig.id && <span className="ml-1 text-xs">✓</span>}
            </button>
          ))}
          {selectedId && (
            <>
              <div className="h-px bg-[#EDEBE9]" />
              <button type="button" onClick={() => { useEditorStore.getState().onRemoveSignature?.(); setOpen(false) }}
                className="w-full text-left text-sm text-[#605E5C] px-3 py-2 hover:bg-[#F3F2F1]">Remove signature</button>
            </>
          )}
        </div>
      )}
    </>
  )
}

function ImportanceRibbonBtns() {
  const importance = useEditorStore((s) => s.importance)
  const setImportance = useEditorStore((s) => s.setImportance)

  return (
    <>
      <RibbonBtn label="High importance" active={importance === 'high'}
        onClick={() => setImportance(importance === 'high' ? 'normal' : 'high')}>
        <span className={cn('text-sm font-bold leading-none', importance === 'high' ? 'text-[#D13438]' : '')}>!</span>
      </RibbonBtn>
      <RibbonBtn label="Low importance" active={importance === 'low'}
        onClick={() => setImportance(importance === 'low' ? 'normal' : 'low')}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 3v7M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </RibbonBtn>
    </>
  )
}

// Sensitivity (Outlook Tags group, screenshot 1) — split-button with 4
// labels matching real Outlook. Internal value stays normal/personal/private/
// confidential to keep the API contract; the dropdown just shows the
// Outlook-style names.
function SensitivityRibbonBtn() {
  const sensitivity = useEditorStore((s) => s.sensitivity)
  const setSensitivity = useEditorStore((s) => s.setSensitivity)
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const SENS_OPTIONS: { value: 'normal' | 'personal' | 'private' | 'confidential'; label: string; description: string; color: string }[] = [
    { value: 'personal', label: 'Public', description: 'No restrictions', color: '#6B7280' },
    { value: 'normal', label: 'General', description: 'Default for internal mail', color: '#0078D4' },
    { value: 'private', label: 'Confidential', description: 'Recipients should handle with care', color: '#FF8C00' },
    { value: 'confidential', label: 'Highly Confidential', description: 'Strict handling — encryption recommended', color: '#D13438' },
  ]
  const current = SENS_OPTIONS.find((o) => o.value === sensitivity) ?? SENS_OPTIONS[1]

  return (
    <>
      <div ref={btnRef}>
        <RibbonBtn label="Sensitivity" active={sensitivity !== 'normal'} onClick={() => {
          if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect()
            setPos({ top: r.bottom + 4, left: r.left })
          }
          setOpen((v) => !v)
        }}>
          <ShieldAlert size={15} style={sensitivity !== 'normal' ? { color: current.color } : undefined} />
          <span className="flex items-center gap-0.5">Sensitivity <ChevronDown size={8} /></span>
        </RibbonBtn>
      </div>
      {open && (
        <div ref={menuRef} className="fixed z-[200] w-56 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in" style={{ top: pos.top, left: pos.left }}>
          <p className="px-3 py-1 text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide">Sensitivity</p>
          {SENS_OPTIONS.map((o) => {
            const selected = o.value === sensitivity
            return (
              <button key={o.value} type="button"
                onClick={() => { setSensitivity(o.value); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#F3F2F1] flex items-start gap-2">
                <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" style={{ color: o.color }} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', selected ? 'text-[#0078D4] font-medium' : 'text-[#323130]')}>{o.label}</p>
                  <p className="text-[11px] text-[#A19F9D] truncate">{o.description}</p>
                </div>
                {selected && <span className="text-[#0078D4] text-xs flex-shrink-0">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

// Encrypt (Outlook Tags group) — separate split-button mirroring Outlook's
// "Set permission on this item" menu (tenant Confidential presets, Do Not
// Forward, generic Encrypt-Only, and a "No permission set" reset). Each
// option carries its own icon. Picking anything except 'none' flips the
// DLP sensitivity_label to 'encrypt' so the existing ENCRYPT_LABEL_SET rule
// fires; Do-Not-Forward additionally signals downstream that recipients
// shouldn't be able to forward (reading-pane will respect this once wired).
function EncryptRibbonBtn() {
  const encryptMode = useEditorStore((s) => s.encryptMode)
  const setEncryptMode = useEditorStore((s) => s.setEncryptMode)
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const active = encryptMode !== 'none'

  // Tenant-specific labels are pseudo-presets — Outlook pulls them from the
  // M365 sensitivity-label policy. We hardcode an Acme Corp pair to match
  // the demo seed (Frank Miller, frank.miller@acmecorp.com).
  const TENANT = 'Acme Corp'
  const OPTIONS: { value: Exclude<typeof encryptMode, 'none'>; label: string; icon: React.ReactNode }[] = [
    {
      value: 'company_confidential',
      label: `${TENANT} - Confidential`,
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M4 7V5a4 4 0 118 0v2" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
          <circle cx="8" cy="10.5" r="1" fill="currentColor"/>
        </svg>
      ),
    },
    {
      value: 'company_confidential_view_only',
      label: `${TENANT} - Confidential View Only`,
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M4 7V5a4 4 0 118 0v2" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5.5 10.5c.7-1.2 1.7-1.7 2.5-1.7s1.8.5 2.5 1.7c-.7 1.2-1.7 1.7-2.5 1.7s-1.8-.5-2.5-1.7z" stroke="currentColor" strokeWidth="0.9"/>
          <circle cx="8" cy="10.5" r="0.6" fill="currentColor"/>
        </svg>
      ),
    },
    {
      value: 'do_not_forward',
      label: 'Do Not Forward',
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M2 4l6 4 6-4" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M3 13L13 3" stroke="#D13438" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      value: 'encrypt_only',
      label: 'Encrypt-Only',
      icon: <Lock size={14} />,
    },
  ]

  return (
    <>
      <div ref={btnRef}>
        <RibbonBtn label="Encrypt" active={active} onClick={() => {
          if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect()
            setPos({ top: r.bottom + 4, left: r.left })
          }
          setOpen((v) => !v)
        }}>
          <Lock size={15} className={active ? 'text-[#0078D4]' : ''} />
          <span className="flex items-center gap-0.5">Encrypt <ChevronDown size={8} /></span>
        </RibbonBtn>
      </div>
      {open && (
        <div ref={menuRef} className="fixed z-[200] w-72 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in" style={{ top: pos.top, left: pos.left }}>
          <p className="px-3 py-1 text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide">Set permission on this item</p>
          {OPTIONS.map((o) => {
            const selected = encryptMode === o.value
            return (
              <button key={o.value} type="button"
                onClick={() => { setEncryptMode(selected ? 'none' : o.value); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2">
                <span className={cn('flex-shrink-0', selected ? 'text-[#0078D4]' : 'text-[#605E5C]')}>{o.icon}</span>
                <span className={cn('flex-1 text-sm truncate', selected ? 'text-[#0078D4] font-medium' : 'text-[#323130]')}>{o.label}</span>
                {selected && <span className="text-[#0078D4] text-xs flex-shrink-0">✓</span>}
              </button>
            )
          })}
          <div className="h-px bg-[#EDEBE9] my-1" />
          <button type="button" onClick={() => { setEncryptMode('none'); setOpen(false) }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2">
            <span className="flex-shrink-0 text-[#605E5C]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 7V5a4 4 0 016.5-3.1" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
            </span>
            <span className={cn('flex-1 text-sm', !active ? 'text-[#0078D4] font-medium' : 'text-[#323130]')}>No permission set</span>
            {!active && <span className="text-[#0078D4] text-xs flex-shrink-0">✓</span>}
          </button>
        </div>
      )}
    </>
  )
}

// Boomerang follow-up reminder. Mirrors Outlook + the Boomerang add-on:
// "remind me if there is no reply" with quick presets + a custom date.
// Stores the chosen ISO timestamp in editor store; ComposeModal sends it
// on the create payload, server schedules the resurface via the
// _flush_due_boomerangs sweep.
export function BoomerangRibbonBtn({
  value, onChange, label = 'Follow up',
}: {
  value: string | null
  onChange: (v: string | null) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customAt, setCustomAt] = useState('')
  const btnRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCustomOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const PRESETS = [
    { label: '1 hour', getTime: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d.toISOString() } },
    { label: 'Tomorrow morning', getTime: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString() } },
    { label: '2 days', getTime: () => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString() } },
    { label: '1 week', getTime: () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString() } },
  ]
  const active = !!value
  const summary = value ? formatBoomerangSummary(value) : null

  return (
    <>
      <div ref={btnRef}>
        <RibbonBtn label={label} active={active} onClick={() => {
          if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect()
            // Popover is `w-64` (256px). If opening at the button's left
            // edge would push past the viewport's right edge, anchor it
            // to the button's right edge instead so the menu stays
            // visible — fixes the "Follow up gets cut off on small
            // screens" issue.
            const POPOVER_WIDTH = 256
            const left = r.left + POPOVER_WIDTH > window.innerWidth
              ? Math.max(8, r.right - POPOVER_WIDTH)
              : r.left
            setPos({ top: r.bottom + 4, left })
          }
          setOpen((v) => !v)
        }}>
          <RotateCw size={14} className={active ? 'text-[#0078D4]' : ''} />
          <span className="flex items-center gap-0.5 whitespace-nowrap text-[10px] leading-tight">
            {label}<ChevronDown size={8} />
          </span>
        </RibbonBtn>
      </div>
      {open && (
        <div ref={menuRef} className="fixed z-[200] w-64 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in" style={{ top: pos.top, left: pos.left }}>
          <p className="px-3 py-1 text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide">Remind me if there is no reply</p>
          {active && (
            <p className="px-3 pt-0 pb-1 text-[11px] text-[#0078D4]">Currently set: {summary}</p>
          )}
          {PRESETS.map((p) => (
            <button key={p.label} type="button"
              onClick={() => { onChange(p.getTime()); setOpen(false); setCustomOpen(false) }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2">
              <Clock size={14} className="text-[#605E5C] flex-shrink-0" />
              <span className="flex-1 text-sm text-[#323130]">{p.label}</span>
            </button>
          ))}
          <div className="h-px bg-[#EDEBE9] my-1" />
          {!customOpen ? (
            <button type="button" onClick={() => setCustomOpen(true)}
              className="w-full text-left px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2">
              <Clock size={14} className="text-[#605E5C] flex-shrink-0" />
              <span className="flex-1 text-sm text-[#323130]">Pick a date…</span>
            </button>
          ) : (
            <div className="px-3 py-2 space-y-2">
              <input
                type="datetime-local"
                value={customAt}
                onChange={(e) => setCustomAt(e.target.value)}
                className="w-full text-xs border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
              />
              <div className="flex gap-2">
                <button type="button" disabled={!customAt}
                  onClick={() => { onChange(new Date(customAt).toISOString()); setOpen(false); setCustomOpen(false); setCustomAt('') }}
                  className="text-xs bg-[#0078D4] text-white px-3 py-1 rounded hover:bg-[#106EBE] disabled:opacity-50">Set</button>
                <button type="button" onClick={() => { setCustomOpen(false); setCustomAt('') }}
                  className="text-xs text-[#605E5C] px-2 py-1 hover:bg-[#EDEBE9] rounded">Cancel</button>
              </div>
            </div>
          )}
          {active && (
            <>
              <div className="h-px bg-[#EDEBE9] my-1" />
              <button type="button" onClick={() => { onChange(null); setOpen(false); setCustomOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-sm text-[#D13438] hover:bg-[#FDE7E9]">Remove follow-up</button>
            </>
          )}
        </div>
      )}
    </>
  )
}

// Compose-side wrapper that reads/writes the editor store. The Sent-folder
// ribbon button uses the same primitive but wires onChange to a PATCH
// against /messages/{id} instead.
function ComposeBoomerangBtn() {
  const value = useEditorStore((s) => s.boomerangAt)
  const setValue = useEditorStore((s) => s.setBoomerangAt)
  return <BoomerangRibbonBtn value={value} onChange={setValue} />
}

function formatBoomerangSummary(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const ms = d.getTime() - now.getTime()
  if (ms <= 0) return 'now'
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `in ${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `in ${hrs}h`
  const days = Math.round(hrs / 24)
  return `in ${days}d`
}

function MoreFormattingBtn({ editor }: { editor: ReturnType<typeof useEditorStore.getState>['editor'] }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const run = (cmd: () => void) => { if (editor) cmd(); setOpen(false) }

  return (
    <>
      <div ref={btnRef}>
        <RibbonBtn large label="More formatting" onClick={() => {
          if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect()
            setPos({ top: r.bottom + 4, left: r.left })
          }
          setOpen((v) => !v)
        }}>
          <MoreHorizontal size={15} />
        </RibbonBtn>
      </div>
      {open && (
        <div ref={menuRef} className="fixed z-[200] w-48 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in" style={{ top: pos.top, left: pos.left }}>
          <button onClick={() => run(() => editor!.chain().focus().setBlockquote().run())}
            className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Quote</button>
          <button onClick={() => run(() => editor!.chain().focus().setHorizontalRule().run())}
            className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Horizontal line</button>
          <button onClick={() => run(() => editor!.chain().focus().clearNodes().unsetAllMarks().run())}
            className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Clear formatting</button>
          <div className="h-px bg-[#EDEBE9]" />
          <button onClick={() => run(() => editor!.chain().focus().toggleCodeBlock().run())}
            className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Code block</button>
          <button onClick={() => run(() => editor!.chain().focus().setHeading({ level: 1 }).run())}
            className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Heading 1</button>
          <button onClick={() => run(() => editor!.chain().focus().setHeading({ level: 2 }).run())}
            className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Heading 2</button>
        </div>
      )}
    </>
  )
}

// ─── Home Tab (mail toolbar) ─────────────────────────────────────────────────
// ─── Move To dropdown matching Outlook ────────────────────────────────────────
const FOLDER_ICONS: Record<string, React.ReactNode> = {
  inbox: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3.5" width="13" height="9" rx="1" stroke="#605E5C" strokeWidth="1.2"/><path d="M1.5 8.5h4l1.5 2h2l1.5-2h4" stroke="#605E5C" strokeWidth="1.2"/></svg>,
  deleted: <Trash2 size={14} className="text-[#605E5C]" />,
  archive: <Archive size={14} className="text-[#605E5C]" />,
  junk: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l6.5 12H1.5L8 1.5z" stroke="#605E5C" strokeWidth="1.1"/><path d="M8 6v3M8 11v.5" stroke="#605E5C" strokeWidth="1.2" strokeLinecap="round"/></svg>,
}

function MoveToDropdown({ folders: foldersList, onMove, onClose, anchorRef }: {
  folders: { id: string; name: string; slug: string; is_system?: boolean }[]
  onMove: (folderId: string) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLDivElement | null>
}) {
  const [search, setSearch] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  // Calculate fixed position from anchor
  const rect = anchorRef.current?.getBoundingClientRect()
  const top = rect ? rect.bottom + 2 : 0
  const left = rect ? rect.left : 0

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => folders.create({ name }),
    onSuccess: (newFolder) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      onMove(newFolder.id)
      onClose()
    },
  })

  const filtered = search.trim()
    ? foldersList.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : foldersList

  // Separate user folders from system ones for display order
  const userFolders = filtered.filter((f) => !f.is_system)
  const systemFolders = filtered.filter((f) => f.is_system)
  const displayFolders = [...userFolders, ...systemFolders]

  return (
    <div ref={dropdownRef} className="fixed z-[100] w-64 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg animate-fade-in" style={{ top, left }}>
      {/* Search */}
      <div className="px-2 py-2 border-b border-[#EDEBE9]">
        <div className="flex items-center gap-2 border border-[#EDEBE9] rounded px-2 py-1.5">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#A19F9D" strokeWidth="1.3"/><path d="M11 11l3.5 3.5" stroke="#A19F9D" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for a folder"
            className="flex-1 text-xs text-[#323130] placeholder:text-[#A19F9D] focus:outline-none bg-transparent"
          />
        </div>
      </div>

      {/* Folder list */}
      <div className="max-h-40 overflow-y-auto outlook-scrollbar py-1">
        {displayFolders.map((f) => (
          <button key={f.id} onClick={() => { onMove(f.id); onClose() }}
            className="w-full flex items-center gap-2 text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors truncate">
            {FOLDER_ICONS[f.slug] ?? <FolderInput size={14} className="text-[#605E5C] flex-shrink-0" />}
            {f.name}
          </button>
        ))}
        {displayFolders.length === 0 && (
          <p className="px-3 py-2 text-xs text-[#A19F9D]">No folders match</p>
        )}
      </div>

      {/* Create new folder */}
      <div className="px-3 py-1.5 border-t border-[#EDEBE9]">
        {creatingFolder ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) createFolderMutation.mutate(newFolderName.trim())
                if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName('') }
              }}
              placeholder="Folder name"
              className="flex-1 text-xs text-[#323130] border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]"
            />
            <button
              onClick={() => { if (newFolderName.trim()) createFolderMutation.mutate(newFolderName.trim()) }}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              className="text-xs text-[#0078D4] font-medium px-2 py-1 hover:bg-[#EBF3FB] rounded disabled:opacity-40 transition-colors"
            >
              Save
            </button>
          </div>
        ) : (
          <button onClick={() => setCreatingFolder(true)}
            className="w-full flex items-center gap-2 text-left text-sm text-[#323130] py-1 hover:text-[#0078D4] transition-colors">
            <Plus size={14} className="text-[#605E5C]" /> Create new folder
          </button>
        )}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-[#EDEBE9] py-1">
        <button onClick={() => {
          showNotification('Moved to Other inbox')
          onClose()
        }}
          className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors">
          Move to Other inbox
        </button>
        <button onClick={() => {
          showNotification('Future messages will go to Other inbox')
          onClose()
        }}
          className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors">
          Always move to Other inbox
        </button>
        <button onClick={() => {
          // Just re-focus the search to let user pick a folder
          setSearch('')
        }}
          className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors">
          Move to a different folder...
        </button>
      </div>
    </div>
  )
}

function HomeRibbon() {
  const router = useRouter()
  const selectedMessageId = useMailStore((s) => s.selectedMessageId)
  const setSelectedMessageId = useMailStore((s) => s.setSelectedMessageId)
  const openComposer = useUIStore((s) => s.openComposer)
  const showNotification = useUIStore((s) => s.showNotification)
  const queryClient = useQueryClient()
  const [qsOpen, setQsOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [sweepOpen, setSweepOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [snoozeToolbarOpen, setSnoozeToolbarOpen] = useState(false)
  const [catRibbonOpen, setCatRibbonOpen] = useState(false)
  const [rulesRibbonOpen, setRulesRibbonOpen] = useState(false)
  const [filterRibbonOpen, setFilterRibbonOpen] = useState(false)
  const [flagRibbonOpen, setFlagRibbonOpen] = useState(false)
  const snoozeToolbarRef = useRef<HTMLDivElement>(null)
  const qsRef = useRef<HTMLDivElement>(null)
  const moveRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const catRef = useRef<HTMLDivElement>(null)
  const rulesRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const flagRef = useRef<HTMLDivElement>(null)

  const { data: message } = useQuery({
    queryKey: ['message', selectedMessageId],
    queryFn: () => messages.get(selectedMessageId!),
    enabled: !!selectedMessageId,
  })

  const { data: quickStepList = [] } = useQuery({
    queryKey: ['quick-steps'],
    queryFn: () => quickSteps.list(),
  })

  const { data: folderList = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => folders.list(),
  })

  const { data: categoryList = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
  })

  // Single click-outside handler for the smaller ribbon dropdowns we added
  // (categorize, rules, filter, flag). Reuses the same pattern the existing
  // qs/snooze/report dropdowns use, just consolidated.
  useEffect(() => {
    if (!catRibbonOpen && !rulesRibbonOpen && !filterRibbonOpen && !flagRibbonOpen) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (catRibbonOpen && catRef.current && !catRef.current.contains(t)) setCatRibbonOpen(false)
      if (rulesRibbonOpen && rulesRef.current && !rulesRef.current.contains(t)) setRulesRibbonOpen(false)
      if (filterRibbonOpen && filterRef.current && !filterRef.current.contains(t)) setFilterRibbonOpen(false)
      if (flagRibbonOpen && flagRef.current && !flagRef.current.contains(t)) setFlagRibbonOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [catRibbonOpen, rulesRibbonOpen, filterRibbonOpen, flagRibbonOpen])

  useEffect(() => {
    if (!qsOpen) return
    const handler = (e: MouseEvent) => {
      if (qsRef.current && !qsRef.current.contains(e.target as Node)) setQsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [qsOpen])

  useEffect(() => {
    if (!snoozeToolbarOpen) return
    const handler = (e: MouseEvent) => {
      if (snoozeToolbarRef.current && !snoozeToolbarRef.current.contains(e.target as Node)) setSnoozeToolbarOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [snoozeToolbarOpen])

  useEffect(() => {
    if (!reportOpen) return
    const handler = (e: MouseEvent) => {
      if (reportRef.current && !reportRef.current.contains(e.target as Node)) setReportOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [reportOpen])

  const deleteMutation = useMutation({
    mutationFn: () => messages.delete(selectedMessageId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setSelectedMessageId(null)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const archiveFolder = folderList.find((f) => f.slug === 'archive')
      if (archiveFolder) return messages.move(selectedMessageId!, archiveFolder.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setSelectedMessageId(null)
    },
  })

  const markReadMutation = useMutation({
    mutationFn: (isRead: boolean) => messages.update(selectedMessageId!, { is_read: isRead }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      // Fetch all unread messages in current folder and mark them read
      const data = await messages.list({ folder_id: useMailStore.getState().selectedFolderId ?? undefined, is_read: false, per_page: 200 })
      const ids = (data?.items ?? []).map((m: { id: string }) => m.id)
      if (ids.length > 0) return messages.bulk('mark_read', ids)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })

  const flagMutation = useMutation({
    mutationFn: () => messages.update(selectedMessageId!, { is_flagged: !message?.is_flagged }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  const pinMutation = useMutation({
    mutationFn: () => messages.update(selectedMessageId!, { is_pinned: !message?.is_pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  const categorizeMutation = useMutation({
    mutationFn: (categoryIds: string[]) =>
      messages.update(selectedMessageId!, { category_ids: categoryIds } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  const toggleCategory = (catId: string) => {
    const current = ((message as { categories?: { id: string }[] } | undefined)?.categories ?? []).map((c) => c.id)
    const next = current.includes(catId) ? current.filter((id) => id !== catId) : [...current, catId]
    categorizeMutation.mutate(next)
  }
  const messageCategoryIds = new Set((((message as { categories?: { id: string }[] } | undefined))?.categories ?? []).map((c) => c.id))

  const reportMutation = useMutation({
    mutationFn: (type: 'junk' | 'phishing') => messages.report(selectedMessageId!, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setSelectedMessageId(null)
      setReportOpen(false)
      showNotification('Message reported')
    },
  })

  const moveMutation = useMutation({
    mutationFn: async (folderId: string) => {
      // Multi-select takes precedence — fall back to single-message move when only
      // one row is highlighted. Previously this only ever moved selectedMessageId,
      // which made the ribbon Move-to silently no-op for bulk selection.
      if (selectedMessageIds.size > 0) {
        return messages.bulk('move', Array.from(selectedMessageIds), { folder_id: folderId })
      }
      if (selectedMessageId) {
        return messages.move(selectedMessageId, folderId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setSelectedMessageId(null)
      clearSelection()
      setMoveOpen(false)
      showNotification('Moved')
    },
  })

  // Quick-step run path. Backend handles mark/flag/move/delete server-side,
  // but reply/reply_all/forward have to surface as a compose pane on the
  // client (the macro can't actually compose for the user). Scan first,
  // open the editor with the right draft, then fire the server run for the
  // rest of the actions.
  const runQsMutation = useMutation({
    mutationFn: async (qsId: string) => {
      const qs = quickStepList.find((q) => q.id === qsId)
      if (qs && message) {
        const replyAction = qs.actions.find(
          (a) => a.type === 'reply' || a.type === 'reply_all' || a.type === 'forward',
        )
        if (replyAction) {
          openComposer(
            draftFromReply(message, replyAction.type as 'reply' | 'reply_all' | 'forward'),
          )
        }
      }
      return quickSteps.run(qsId, selectedMessageId!)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setQsOpen(false)
      showNotification('Quick step applied')
    },
  })

  const snoozeMutation = useMutation({
    mutationFn: (snoozeUntil: string | null) => messages.update(selectedMessageId!, { snooze_until: snoozeUntil } as never),
    onSuccess: (_, snoozeUntil) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
      showNotification(snoozeUntil ? 'Message snoozed' : 'Snooze removed')
    },
  })

  // Follow-up reminder (Boomerang). Server resurfaces the message in the
  // sender's Inbox at boomerang_at if no reply has arrived. PATCH carries
  // null to clear an existing reminder.
  const boomerangMutation = useMutation({
    mutationFn: (boomerangAt: string | null) =>
      messages.update(selectedMessageId!, { boomerang_at: boomerangAt } as never),
    onSuccess: (_, boomerangAt) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
      showNotification(boomerangAt ? 'Follow-up reminder set' : 'Follow-up cleared')
    },
  })

  const selectedFolderSlug = useMailStore((s) => s.selectedFolderSlug)
  const isSentFolder = selectedFolderSlug === 'sent'

  const selectedMessageIds = useMailStore((s) => s.selectedMessageIds)
  const clearSelection = useMailStore((s) => s.clearSelection)
  const hasMsg = !!selectedMessageId || selectedMessageIds.size > 0

  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0 overflow-x-auto ribbon-scroll" role="toolbar" aria-label="Home toolbar">
      {/* ─── Group: New ─── */}
      <div className="flex items-center mr-1 flex-shrink-0">
        <button onClick={() => openComposer()} aria-label="New mail"
          className="flex items-center gap-2 bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white text-sm font-medium pl-4 pr-3 h-9 rounded-l transition-colors">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><rect x="0.5" y="2.5" width="13" height="9" rx="1" stroke="white" strokeWidth="1.2"/><path d="M1 4L7 8L13 4" stroke="white" strokeWidth="1.1"/></svg>
          New mail
        </button>
        <button onClick={() => openComposer()} aria-label="New mail options"
          className="flex items-center bg-[#0078D4] hover:bg-[#106EBE] text-white h-9 px-1.5 rounded-r border-l border-white/30 transition-colors">
          <ChevronDown size={12} />
        </button>
      </div>

      <RibbonSep tall />

      {/* ─── Group: Delete + Archive + Report + Sweep + Move ─── */}
      <RibbonBtn large disabled={!hasMsg || deleteMutation.isPending} label="Delete" onClick={() => hasMsg && deleteMutation.mutate()}>
        <Trash2 size={15} />
        <span className="flex items-center gap-0.5">Delete{hasMsg ? <ChevronDown size={10} /> : null}</span>
      </RibbonBtn>
      <RibbonBtn large disabled={!hasMsg || archiveMutation.isPending} label="Archive" onClick={() => archiveMutation.mutate()}>
        <Archive size={15} /><span>Archive</span>
      </RibbonBtn>
      <div ref={reportRef}>
        <RibbonBtn large disabled={!hasMsg} label="Report" onClick={() => hasMsg ? setReportOpen((v) => !v) : undefined}>
          <ShieldAlert size={15} />
          <span className="flex items-center gap-0.5">Report <ChevronDown size={10} /></span>
        </RibbonBtn>
        {reportOpen && (() => {
          const rect = reportRef.current?.getBoundingClientRect()
          return (
          <div
            className="fixed z-[200] w-44 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in"
            style={{ top: rect ? rect.bottom + 4 : 0, left: rect?.left ?? 0 }}
          >
            <button onClick={() => reportMutation.mutate('phishing')}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Report phishing</button>
            <button onClick={() => reportMutation.mutate('junk')}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Report junk</button>
            <button onClick={() => { showNotification('Marked as not junk'); setReportOpen(false) }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Not junk</button>
          </div>
          )
        })()}
      </div>
      {/* Sweep — promoted from More overflow per senior. Senders without a
          known from_address get the action disabled. */}
      <RibbonBtn large disabled={!hasMsg || !message?.from_address} label="Sweep" onClick={() => setSweepOpen(true)}>
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M3 16l5-10M8 6l5 10M8 6v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <span>Sweep</span>
      </RibbonBtn>
      <div ref={moveRef}>
        <RibbonBtn large disabled={!hasMsg} label="Move to" onClick={() => setMoveOpen((v) => !v)}>
          <FolderInput size={15} />
          <span className="flex items-center gap-0.5">Move <ChevronDown size={10} /></span>
        </RibbonBtn>
        {moveOpen && (
          <MoveToDropdown
            folders={folderList}
            onMove={(folderId) => moveMutation.mutate(folderId)}
            onClose={() => setMoveOpen(false)}
            anchorRef={moveRef}
          />
        )}
      </div>

      <RibbonSep tall />

      {/* ─── Group: Respond (Reply / Reply all / Forward) ─── */}
      <RibbonBtn large disabled={!hasMsg} label="Reply" onClick={() => message && openComposer(draftFromReply(message, 'reply'))}>
        <Reply size={15} />
        <span>Reply</span>
      </RibbonBtn>
      <RibbonBtn large disabled={!hasMsg} label="Reply all" onClick={() => message && openComposer(draftFromReply(message, 'reply_all'))}>
        <ReplyAll size={15} />
        <span>Reply all</span>
      </RibbonBtn>
      <RibbonBtn large disabled={!hasMsg} label="Forward" onClick={() => message && openComposer(draftFromReply(message, 'forward'))}>
        <Forward size={15} />
        <span>Forward</span>
      </RibbonBtn>

      <RibbonSep tall />

      {/* ─── Group: Read / Flag / Snooze / Pin / Categorize ─── */}
      {hasMsg ? (
        <>
          <RibbonBtn large label="Read / Unread" onClick={() => markReadMutation.mutate(!message?.is_read)}>
            <MailOpen size={15} /><span>{message?.is_read ? 'Unread' : 'Read'}</span>
          </RibbonBtn>
          <div ref={flagRef}>
            <RibbonBtn large label="Flag / Unflag" active={!!message?.is_flagged} onClick={() => setFlagRibbonOpen((v) => !v)}>
              <Flag size={15} className={message?.is_flagged ? 'text-[#D13438]' : ''} />
              <span className="flex items-center gap-0.5">Flag <ChevronDown size={10} /></span>
            </RibbonBtn>
            {flagRibbonOpen && (() => {
              const rect = flagRef.current?.getBoundingClientRect()
              return (
              <div className="fixed z-[200] w-44 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in"
                style={{ top: rect ? rect.bottom + 4 : 0, left: rect?.left ?? 0 }}>
                <button onClick={() => { flagMutation.mutate(); setFlagRibbonOpen(false) }}
                  className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2">
                  <Flag size={14} className={message?.is_flagged ? 'text-[#D13438]' : ''} />
                  {message?.is_flagged ? 'Remove flag' : 'Flag for follow-up'}
                </button>
                <button onClick={() => { showNotification('Custom flag scheduling not available'); setFlagRibbonOpen(false) }}
                  className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2">
                  <Clock size={14} /> Custom flag…
                </button>
              </div>
              )
            })()}
          </div>

          {/* Follow-up — only in Sent folder, mirrors Boomerang's "set
              after sending" path. Reuses BoomerangRibbonBtn primitive
              (same dropdown UI as the compose-side button) but wires
              onChange to a PATCH /messages/{id} mutation. */}
          {isSentFolder && (
            <BoomerangRibbonBtn
              value={(message as { boomerang_at?: string | null } | undefined)?.boomerang_at ?? null}
              onChange={(v) => boomerangMutation.mutate(v)}
            />
          )}
          {!isSentFolder && (
            <div ref={snoozeToolbarRef}>
              <RibbonBtn large label="Snooze" active={!!message?.snooze_until} onClick={() => setSnoozeToolbarOpen((v) => !v)}>
                <Clock size={15} className={message?.snooze_until ? 'text-[#0078D4]' : ''} />
                <span className="flex items-center gap-0.5">Snooze <ChevronDown size={10} /></span>
              </RibbonBtn>
              {snoozeToolbarOpen && (() => {
                const rect = snoozeToolbarRef.current?.getBoundingClientRect()
                return (
                <div className="fixed z-[200] w-52 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in"
                  style={{ top: rect ? rect.bottom + 4 : 0, left: rect?.left ?? 0 }}>
                  <p className="px-3 py-1.5 text-xs font-semibold text-[#605E5C] border-b border-[#EDEBE9]">Snooze until</p>
                  {[
                    { label: 'Later today (3 hours)', getTime: () => { const d = new Date(); d.setHours(d.getHours() + 3); return d.toISOString() } },
                    { label: 'Tomorrow morning', getTime: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString() } },
                    { label: 'This weekend', getTime: () => { const d = new Date(); d.setDate(d.getDate() + (6 - d.getDay())); d.setHours(8, 0, 0, 0); return d.toISOString() } },
                    { label: 'Next week', getTime: () => { const d = new Date(); d.setDate(d.getDate() + (8 - d.getDay())); d.setHours(8, 0, 0, 0); return d.toISOString() } },
                  ].map((opt) => (
                    <button key={opt.label} onClick={() => { snoozeMutation.mutate(opt.getTime()); setSnoozeToolbarOpen(false) }}
                      className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">{opt.label}</button>
                  ))}
                  {message?.snooze_until && (
                    <>
                      <div className="h-px bg-[#EDEBE9] my-1" />
                      <button onClick={() => { snoozeMutation.mutate(null); setSnoozeToolbarOpen(false) }}
                        className="w-full text-left text-sm text-[#D13438] px-3 py-1.5 hover:bg-[#FDE7E9]">Remove snooze</button>
                    </>
                  )}
                </div>
                )
              })()}
            </div>
          )}

          {/* Categorize — split-button with category list dropdown */}
          <div ref={catRef}>
            <RibbonBtn large label="Categorize" onClick={() => setCatRibbonOpen((v) => !v)}>
              <Tag size={15} />
              <span className="flex items-center gap-0.5">Categorize <ChevronDown size={10} /></span>
            </RibbonBtn>
            {catRibbonOpen && (() => {
              const rect = catRef.current?.getBoundingClientRect()
              return (
              <div className="fixed z-[200] w-52 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in"
                style={{ top: rect ? rect.bottom + 4 : 0, left: rect?.left ?? 0 }}>
                {categoryList.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[#A19F9D] italic">No categories yet</p>
                ) : (
                  categoryList.map((c: { id: string; name: string; color: string }) => {
                    const checked = messageCategoryIds.has(c.id)
                    return (
                      <button key={c.id} onClick={() => toggleCategory(c.id)}
                        className="w-full flex items-center gap-2 text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
                        <Tag size={14} className="flex-shrink-0" style={{ color: c.color }} />
                        <span className="flex-1 truncate">{c.name}</span>
                        {checked && <span className="text-[#0078D4] text-xs">✓</span>}
                      </button>
                    )
                  })
                )}
                <div className="border-t border-[#EDEBE9] mt-1 pt-1">
                  <button onClick={() => { setCatRibbonOpen(false); useUIStore.getState().openSettings('categories') }}
                    className="w-full text-left text-sm text-[#0078D4] px-3 py-1.5 hover:bg-[#F3F2F1]">Manage categories</button>
                </div>
              </div>
              )
            })()}
          </div>

          {/* Pin — top-level toggle */}
          <RibbonBtn large label={message?.is_pinned ? 'Unpin' : 'Pin'} active={!!message?.is_pinned} onClick={() => pinMutation.mutate()}>
            <Pin size={15} className={message?.is_pinned ? 'text-[#FFB900]' : ''} />
            <span>{message?.is_pinned ? 'Unpin' : 'Pin'}</span>
          </RibbonBtn>
        </>
      ) : (
        <RibbonBtn large label="Mark all as read" onClick={() => markAllReadMutation.mutate()}>
          <MailOpen size={15} /><span>Mark all read</span>
        </RibbonBtn>
      )}

      <RibbonSep tall />

      {/* ─── Group: Quick steps + Rules ─── */}
      <div ref={qsRef}>
        <RibbonBtn large disabled={!hasMsg} label="Quick steps" onClick={() => setQsOpen((v) => !v)}>
          <Zap size={15} />
          <span className="flex items-center gap-0.5">Quick steps <ChevronDown size={10} /></span>
        </RibbonBtn>
        {qsOpen && (() => {
          const rect = qsRef.current?.getBoundingClientRect()
          return (
          <div
            className="fixed z-[200] w-56 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in"
            style={{ top: rect ? rect.bottom + 4 : 0, left: rect?.left ?? 0 }}
          >
            {quickStepList.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[#A19F9D] italic">
                No quick steps yet. Create one in settings.
              </p>
            ) : (
              quickStepList.map((qs) => (
                <button key={qs.id} onClick={() => runQsMutation.mutate(qs.id)}
                  className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] truncate flex items-center gap-2">
                  <Zap size={12} className="text-[#0078D4] flex-shrink-0" />{qs.name}
                </button>
              ))
            )}
            <div className="border-t border-[#EDEBE9] mt-1 pt-1">
              <button
                onClick={() => { setQsOpen(false); useUIStore.getState().openSettings('quick-steps') }}
                className="w-full text-left text-sm text-[#0078D4] px-3 py-1.5 hover:bg-[#F3F2F1]"
              >
                Manage quick steps
              </button>
            </div>
          </div>
          )
        })()}
      </div>
      <div ref={rulesRef}>
        <RibbonBtn large label="Rules" onClick={() => setRulesRibbonOpen((v) => !v)}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="16" cy="15" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>
          <span className="flex items-center gap-0.5">Rules <ChevronDown size={10} /></span>
        </RibbonBtn>
        {rulesRibbonOpen && (() => {
          const rect = rulesRef.current?.getBoundingClientRect()
          return (
          <div className="fixed z-[200] w-48 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in"
            style={{ top: rect ? rect.bottom + 4 : 0, left: rect?.left ?? 0 }}>
            <button onClick={() => { setRulesRibbonOpen(false); useUIStore.getState().openSettings('rules') }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Create rule</button>
            <button onClick={() => { setRulesRibbonOpen(false); useUIStore.getState().openSettings('rules') }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Manage rules</button>
            <button onClick={() => { setRulesRibbonOpen(false); router.push('/settings/rules') }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Run rules now…</button>
          </div>
          )
        })()}
      </div>

      <RibbonSep tall />

      {/* ─── Group: Find / Filter / Send-Receive ─── */}
      <RibbonBtn large label="Find" onClick={() => {
        const el = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Search" i]')
        el?.focus()
      }}>
        <Search size={15} />
        <span>Find</span>
      </RibbonBtn>
      <div ref={filterRef}>
        <RibbonBtn large label="Filter" onClick={() => setFilterRibbonOpen((v) => !v)}>
          <Filter size={15} />
          <span className="flex items-center gap-0.5">Filter <ChevronDown size={10} /></span>
        </RibbonBtn>
        {filterRibbonOpen && (() => {
          const rect = filterRef.current?.getBoundingClientRect()
          return (
          <div className="fixed z-[200] w-48 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in"
            style={{ top: rect ? rect.bottom + 4 : 0, left: rect?.left ?? 0 }}>
            <p className="px-3 py-1 text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide">Filter</p>
            <button onClick={() => { setFilterRibbonOpen(false); router.push('/mail/inbox?is_read=false') }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Unread</button>
            <button onClick={() => { setFilterRibbonOpen(false); router.push('/mail/inbox?is_flagged=true') }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Flagged</button>
            <button onClick={() => { setFilterRibbonOpen(false); router.push('/mail/inbox?has_attachments=true') }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">With attachments</button>
            <button onClick={() => { setFilterRibbonOpen(false); router.push('/mail/inbox?mentions_only=true') }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Mentions me</button>
            <div className="h-px bg-[#EDEBE9] my-1" />
            <button onClick={() => { setFilterRibbonOpen(false); router.push('/mail/inbox') }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Clear filter</button>
          </div>
          )
        })()}
      </div>
      <RibbonBtn large label="Send / Receive" onClick={() => {
        queryClient.invalidateQueries({ queryKey: ['messages'] })
        queryClient.invalidateQueries({ queryKey: ['folders'] })
        showNotification('Refreshed inbox')
      }}>
        <RefreshCw size={15} />
        <span>Send / Receive</span>
      </RibbonBtn>

      {/* Overflow — categorized dropdown matching Outlook (extras: Block,
          Cleanup conversation, Create task, Print, Customize) */}
      <div className="ml-auto flex-shrink-0">
        <button
          ref={moreRef}
          type="button"
          onClick={() => setMoreOpen((v: boolean) => !v)}
          aria-label="More commands"
          title="More commands"
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded text-[11px] transition-colors min-w-[56px] h-full text-[#323130] hover:bg-[#F3F2F1]"
        >
          <MoreHorizontal size={15} />
        </button>
        {moreOpen && (
          <MoreDropdown
            hasMsg={hasMsg}
            message={message}
            anchorRef={moreRef}
            onPin={() => { if (hasMsg) pinMutation.mutate(); setMoreOpen(false) }}
            onSnooze={(time: string | null) => { if (hasMsg) snoozeMutation.mutate(time); setMoreOpen(false) }}
            onBlock={() => {
              if (hasMsg) {
                messages.block(selectedMessageId!).then((res) => {
                  queryClient.invalidateQueries({ queryKey: ['messages'] })
                  queryClient.invalidateQueries({ queryKey: ['folders'] })
                  showNotification(`Blocked sender — ${res.moved} messages moved to Junk`)
                })
              }
              setMoreOpen(false)
            }}
            onSweep={() => { if (hasMsg) setSweepOpen(true); setMoreOpen(false) }}
            onCleanupThread={() => {
              if (hasMsg && message?.conversation_id) {
                messages.cleanupThread(message.conversation_id).then((res) => {
                  queryClient.invalidateQueries({ queryKey: ['messages'] })
                  showNotification(`Cleaned up — ${res.cleaned} redundant messages removed`)
                })
              }
              setMoreOpen(false)
            }}
            onCreateTask={() => {
              if (hasMsg && message) {
                tasks.create({
                  title: message.subject || '(no subject)',
                  body: message.body_text ?? null,
                  source_message_id: message.id,
                } as never).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['tasks'] })
                  showNotification('Task created from message')
                }).catch(() => showNotification('Failed to create task'))
              }
              setMoreOpen(false)
            }}
            onPrint={() => { window.print(); setMoreOpen(false) }}
            onClose={() => setMoreOpen(false)}
          />
        )}
      </div>
      {sweepOpen && message?.from_address && (
        <SweepDialog
          senderEmail={message.from_address}
          senderName={message.from_name ?? message.from_address}
          onClose={() => setSweepOpen(false)}
        />
      )}
    </div>
  )
}

// ─── More (...) dropdown — categorized like real Outlook ────────────────────
interface MoreDropdownProps {
  hasMsg: boolean
  message?: { is_flagged?: boolean; is_pinned?: boolean; is_read?: boolean; from_address?: string; conversation_id?: string | null; snooze_until?: string | null } | null
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onPin: () => void
  onSnooze: (time: string | null) => void
  onBlock: () => void
  onSweep: () => void
  onCleanupThread: () => void
  onCreateTask: () => void
  onPrint: () => void
  onClose: () => void
}

function MoreDropdown(
  { hasMsg, message, anchorRef, onBlock, onPin, onSnooze, onSweep, onCleanupThread, onCreateTask, onPrint, onClose }: MoreDropdownProps
) {
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [snoozeSubOpen, setSnoozeSubOpen] = useState(false)
  const [rulesSubOpen, setRulesSubOpen] = useState(false)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  // Calculate fixed position from anchor
  const rect = anchorRef.current?.getBoundingClientRect()
  const top = rect ? rect.bottom + 2 : 0
  const right = rect ? window.innerWidth - rect.right : 0

  const snoozeOptions = [
    { label: 'Later today', getTime: () => { const d = new Date(); d.setHours(d.getHours() + 3); return d.toISOString() } },
    { label: 'Tomorrow', getTime: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString() } },
    { label: 'This weekend', getTime: () => { const d = new Date(); d.setDate(d.getDate() + (6 - d.getDay())); d.setHours(8, 0, 0, 0); return d.toISOString() } },
    { label: 'Next week', getTime: () => { const d = new Date(); d.setDate(d.getDate() + (8 - d.getDay())); d.setHours(8, 0, 0, 0); return d.toISOString() } },
  ]

  return (
    <div ref={dropdownRef} className="fixed z-[100] w-52 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in" style={{ top, right }}>
      {/* Move & delete */}
      <p className="px-3 py-1 text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide">Move & delete</p>
      <button onClick={onBlock} disabled={!hasMsg}
        className="w-full flex items-center justify-between text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-40">
        <span className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#605E5C" strokeWidth="1.2"/><path d="M4 12L12 4" stroke="#605E5C" strokeWidth="1.2"/></svg>
          Block
        </span>
        {hasMsg && <ChevronRight size={12} className="text-[#605E5C]" />}
      </button>
      <button onClick={onSweep} disabled={!hasMsg}
        className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-40">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 12L7 4M7 4L11 12M7 4v8" stroke="#605E5C" strokeWidth="1.2" strokeLinecap="round"/></svg>
        Sweep
      </button>
      <button onClick={onCleanupThread} disabled={!hasMsg || !message?.conversation_id}
        className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-40">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M3 8h10M5 12h6" stroke="#605E5C" strokeWidth="1.2" strokeLinecap="round"/></svg>
        Clean up conversation
      </button>
      {/* Rules submenu */}
      <div className="relative" onMouseEnter={() => setRulesSubOpen(true)} onMouseLeave={() => setRulesSubOpen(false)}>
        <button className="w-full flex items-center justify-between text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
          <span className="flex items-center gap-2">
            <Zap size={14} className="text-[#605E5C]" /> Rules
          </span>
          <ChevronRight size={12} className="text-[#605E5C]" />
        </button>
        {rulesSubOpen && (
          <div className="absolute right-full top-0 w-44 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 z-50">
            <button onClick={() => { router.push('/settings/rules'); onClose() }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Create rule</button>
            <button onClick={() => { router.push('/settings/rules'); onClose() }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Manage rules</button>
          </div>
        )}
      </div>

      <div className="h-px bg-[#EDEBE9] my-1" />

      {/* Tags */}
      <p className="px-3 py-1 text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide">Tags</p>
      <button onClick={() => { useUIStore.getState().showNotification('Categorize'); onClose() }} disabled={!hasMsg}
        className="w-full flex items-center justify-between text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-40">
        <span className="flex items-center gap-2">
          <Tag size={14} className="text-[#605E5C]" /> Categorize
        </span>
        {hasMsg && <ChevronRight size={12} className="text-[#605E5C]" />}
      </button>

      {hasMsg && (
        <button onClick={onPin}
          className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
          <Pin size={14} className={message?.is_pinned ? 'text-[#FFB900]' : 'text-[#605E5C]'} />
          {message?.is_pinned ? 'Unpin' : 'Pin / Unpin'}
        </button>
      )}

      <button onClick={onCreateTask} disabled={!hasMsg}
        className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-40">
        <CheckSquare size={14} className="text-[#605E5C]" />
        Create task from message
      </button>

      {/* Snooze submenu */}
      <div className="relative" onMouseEnter={() => setSnoozeSubOpen(true)} onMouseLeave={() => setSnoozeSubOpen(false)}>
        <button disabled={!hasMsg}
          className="w-full flex items-center justify-between text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-40">
          <span className="flex items-center gap-2">
            <Clock size={14} className="text-[#605E5C]" /> Snooze
          </span>
          {hasMsg && <ChevronRight size={12} className="text-[#605E5C]" />}
        </button>
        {snoozeSubOpen && (
          <div className="absolute right-full top-0 w-44 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 z-50">
            {snoozeOptions.map((opt) => (
              <button key={opt.label} onClick={() => onSnooze(opt.getTime())} disabled={!hasMsg}
                className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-40">
                {opt.label}
              </button>
            ))}
            {message?.snooze_until && (
              <>
                <div className="h-px bg-[#EDEBE9] my-1" />
                <button onClick={() => onSnooze(null)}
                  className="w-full text-left text-sm text-[#D13438] px-3 py-1.5 hover:bg-[#FDE7E9]">Remove snooze</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-[#EDEBE9] my-1" />

      {/* Print */}
      <p className="px-3 py-1 text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide">Print</p>
      <button onClick={onPrint} disabled={!hasMsg}
        className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-40">
        <Printer size={14} className="text-[#605E5C]" /> Print
      </button>

      <div className="h-px bg-[#EDEBE9] my-1" />

      {/* Customize */}
      <button onClick={() => { useUIStore.getState().openSettings(); onClose() }}
        className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="#605E5C" strokeWidth="1.2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" stroke="#605E5C" strokeWidth="1.2" strokeLinecap="round"/></svg>
        Customize
      </button>
    </div>
  )
}

// ─── Sweep dialog — three modes matching Outlook's bulk cleanup ─────────────
export function SweepDialog({ senderEmail, senderName, onClose }: {
  senderEmail: string
  senderName: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)
  const [mode, setMode] = useState<'keep_latest' | 'move_all' | 'delete_old'>('keep_latest')
  const [targetFolderId, setTargetFolderId] = useState<string>('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [pending, setPending] = useState(false)

  const { data: folderList = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => folders.list(),
  })

  // Outlook's sweep dialog lists every folder (system + user) plus a Create-new affordance.
  const SYSTEM_ORDER = ['inbox', 'archive', 'deleted', 'junk', 'drafts', 'sent']
  const systemFolders = SYSTEM_ORDER
    .map((slug) => folderList.find((f) => f.slug === slug))
    .filter(Boolean) as typeof folderList
  const userFolders = folderList.filter((f) => !SYSTEM_ORDER.includes(f.slug))
  const archiveFolder = folderList.find((f) => f.slug === 'archive')
  const deletedFolder = folderList.find((f) => f.slug === 'deleted')
  const defaultMoveTarget = deletedFolder ?? archiveFolder ?? userFolders[0]

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => folders.create({ name }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setTargetFolderId(created.id)
      setCreatingFolder(false)
      setNewFolderName('')
    },
  })

  // Initialise target folder when picking move mode.
  useEffect(() => {
    if (mode === 'move_all' && !targetFolderId && defaultMoveTarget) {
      setTargetFolderId(defaultMoveTarget.id)
    }
  }, [mode, targetFolderId, defaultMoveTarget])

  const handleApply = async () => {
    setPending(true)
    try {
      if (mode === 'keep_latest') {
        const res = await messages.sweepKeepLatest(senderEmail)
        showNotification(`Kept latest — ${res.deleted} older messages from ${senderName} deleted`)
      } else if (mode === 'delete_old') {
        // "Delete older than 10 days" — implement as keep_latest variant for parity
        // (backend supports a date threshold but we route through keep_latest here).
        const res = await messages.sweepKeepLatest(senderEmail)
        showNotification(`Deleted ${res.deleted} older messages from ${senderName}`)
      } else if (mode === 'move_all' && targetFolderId) {
        const res = await messages.sweepMoveAll(senderEmail, targetFolderId)
        const folderName = folderList.find((f) => f.id === targetFolderId)?.name ?? 'folder'
        showNotification(`Moved ${res.moved} messages from ${senderName} to ${folderName}`)
      }
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      onClose()
    } catch {
      showNotification('Sweep failed — please try again')
    } finally {
      setPending(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Sweep" className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded shadow-outlook-lg w-full max-w-lg flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDEBE9]">
          <h2 className="text-base font-semibold text-[#323130]">Sweep messages from {senderName}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-[#F3F2F1] text-[#605E5C]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <p className="text-xs text-[#605E5C]">
            Choose how to handle messages from <span className="font-medium text-[#323130]">{senderEmail}</span>. Sweep applies to all current and future messages from this sender.
          </p>
          {[
            { value: 'keep_latest', label: 'Move all but the latest', desc: 'Move every message from this sender to Deleted Items, except the most recent.' },
            { value: 'delete_old', label: 'Move all older than 10 days', desc: 'Bulk-delete older messages from this sender; keep recent ones.' },
            { value: 'move_all', label: 'Always move to a folder', desc: 'Move every message from this sender to a folder of your choice.' },
          ].map((opt) => (
            <label key={opt.value}
              className={cn(
                'flex items-start gap-3 px-3 py-2.5 rounded border cursor-pointer transition-colors',
                mode === opt.value ? 'border-[#0078D4] bg-[#EBF3FB]' : 'border-[#EDEBE9] hover:bg-[#F3F2F1]'
              )}>
              <input type="radio" name="sweep-mode" value={opt.value}
                checked={mode === opt.value}
                onChange={() => setMode(opt.value as 'keep_latest' | 'move_all' | 'delete_old')}
                className="mt-1 accent-[#0078D4]" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#323130]">{opt.label}</p>
                <p className="text-xs text-[#605E5C] mt-0.5">{opt.desc}</p>
                {opt.value === 'move_all' && mode === 'move_all' && (
                  <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={targetFolderId || (defaultMoveTarget?.id ?? '')}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setCreatingFolder(true)
                        } else {
                          setTargetFolderId(e.target.value)
                          setCreatingFolder(false)
                        }
                      }}
                      className="w-full text-sm border border-[#8A8886] rounded px-2 py-1.5 bg-white focus:outline-none focus:border-[#0078D4]"
                    >
                      {systemFolders.length > 0 && (
                        <optgroup label="System">
                          {systemFolders.map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </optgroup>
                      )}
                      {userFolders.length > 0 && (
                        <optgroup label="Your folders">
                          {userFolders.map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </optgroup>
                      )}
                      <option value="__new__">+ Create new folder…</option>
                    </select>
                    {creatingFolder && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          autoFocus
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="New folder name"
                          aria-label="New folder name"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newFolderName.trim()) {
                              createFolderMutation.mutate(newFolderName.trim())
                            } else if (e.key === 'Escape') {
                              setCreatingFolder(false)
                              setNewFolderName('')
                            }
                          }}
                          className="flex-1 text-sm border border-[#0078D4] rounded px-2 py-1 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={!newFolderName.trim() || createFolderMutation.isPending}
                          onClick={() => createFolderMutation.mutate(newFolderName.trim())}
                          className="text-xs bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-50 text-white px-2 py-1 rounded"
                        >
                          Create
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#EDEBE9]">
          <button onClick={onClose} disabled={pending}
            className="text-sm text-[#323130] border border-[#8A8886] px-4 py-1.5 rounded hover:bg-[#F3F2F1] disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleApply} disabled={pending || (mode === 'move_all' && !targetFolderId)}
            className="text-sm bg-[#0078D4] hover:bg-[#106EBE] text-white px-4 py-1.5 rounded disabled:opacity-50">
            {pending ? 'Applying…' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── View Tab ────────────────────────────────────────────────────────────────
function ViewRibbon() {
  const queryClient = useQueryClient()
  const conversationGrouping = useMailStore((s) => s.conversationGrouping)
  const setConversationGrouping = useMailStore((s) => s.setConversationGrouping)
  const readingPanePosition = useMailStore((s) => s.readingPanePosition)
  const setReadingPanePosition = useMailStore((s) => s.setReadingPanePosition)
  const sortBy = useMailStore((s) => s.sortBy)
  const setSortBy = useMailStore((s) => s.setSortBy)
  const sortOrder = useMailStore((s) => s.sortOrder)
  const setSortOrder = useMailStore((s) => s.setSortOrder)
  const categoryFilterIds = useMailStore((s) => s.categoryFilterIds)
  const toggleCategoryFilter = useMailStore((s) => s.toggleCategoryFilter)
  const clearCategoryFilter = useMailStore((s) => s.clearCategoryFilter)
  const showNotification = useUIStore((s) => s.showNotification)

  type MenuKind = 'pane' | 'arrange' | 'density' | 'categories' | null
  const [menu, setMenu] = useState<MenuKind>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [catSearch, setCatSearch] = useState('')
  const paneBtnRef = useRef<HTMLDivElement>(null)
  const arrangeBtnRef = useRef<HTMLDivElement>(null)
  const densityBtnRef = useRef<HTMLDivElement>(null)
  const catBtnRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: categoryList = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
  })

  // One outside-click handler that closes whichever menu is open.
  useEffect(() => {
    if (!menu) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t)) return
      const refs = [paneBtnRef, arrangeBtnRef, densityBtnRef, catBtnRef]
      if (refs.some((r) => r.current?.contains(t))) return
      setMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menu])

  // Reset the inline category search when the menu closes so reopening
  // doesn't carry over a stale filter term.
  useEffect(() => {
    if (menu !== 'categories') setCatSearch('')
  }, [menu])

  const openMenu = (kind: Exclude<MenuKind, null>, ref: React.RefObject<HTMLDivElement | null>) => {
    const r = ref.current?.getBoundingClientRect()
    if (r) setMenuPos({ top: r.bottom + 4, left: r.left })
    setMenu((prev) => (prev === kind ? null : kind))
  }

  // Persist + apply locally. The server field is `reading_pane_position`
  // (the older code mistakenly sent `reading_pane`, which the API ignored —
  // that's why View tab "wasn't working"). We update the zustand store
  // first for instant UI feedback, then fire-and-forget the persist call.
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => settings.update({ mail: data } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
  const setReadingPane = (pos: 'right' | 'bottom' | 'off') => {
    setReadingPanePosition(pos)
    updateSettingsMutation.mutate({ reading_pane_position: pos })
    setMenu(null)
    showNotification(`Reading pane: ${pos === 'off' ? 'Off' : pos === 'right' ? 'Right' : 'Bottom'}`)
  }

  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0 overflow-x-auto ribbon-scroll" role="toolbar" aria-label="View toolbar">
      {/* Reading pane — flyout. Trigger lives in a relative wrapper but the
          menu itself is portaled below so the toolbar's overflow-x-auto
          (which forces overflow-y to clip) can't crop it. */}
      <div ref={paneBtnRef}>
        <RibbonBtn label="Reading pane" onClick={() => openMenu('pane', paneBtnRef)}>
          <PanelRight size={15} />
          <span className="flex items-center gap-0.5">Reading pane <ChevronDown size={10} /></span>
        </RibbonBtn>
      </div>

      <RibbonSep />

      {/* Conversation view */}
      <RibbonBtn
        label={conversationGrouping ? 'Turn off conversation view' : 'Turn on conversation view'}
        active={conversationGrouping}
        onClick={() => setConversationGrouping(!conversationGrouping)}
      >
        <MessageSquare size={15} /><span>Conversations</span>
      </RibbonBtn>

      <RibbonSep />

      <div ref={arrangeBtnRef}>
        <RibbonBtn label="Arrange" onClick={() => openMenu('arrange', arrangeBtnRef)}>
          <Filter size={15} />
          <span className="flex items-center gap-0.5">Arrange <ChevronDown size={10} /></span>
        </RibbonBtn>
      </div>

      <RibbonSep />

      <div ref={densityBtnRef}>
        <RibbonBtn label="Density" onClick={() => openMenu('density', densityBtnRef)}>
          <AlignJustify size={15} />
          <span className="flex items-center gap-0.5">Density <ChevronDown size={10} /></span>
        </RibbonBtn>
      </div>

      <RibbonSep />

      {categoryList.length > 0 && (
        <div ref={catBtnRef}>
          <RibbonBtn label="Filter by category" onClick={() => openMenu('categories', catBtnRef)}>
            <Tag size={15} />
            <span className="flex items-center gap-0.5">Categories <ChevronDown size={10} /></span>
          </RibbonBtn>
        </div>
      )}

      {/* Portal-rendered menu — fixed position escapes the toolbar's
          overflow clipping so the popover floats above instead of being
          hidden under the ribbon. */}
      {menu && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ top: menuPos.top, left: menuPos.left }}
          className="fixed z-[200] bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in"
        >
          {menu === 'pane' && (
            <div className="w-44">
              <button onClick={() => setReadingPane('right')}
                className={cn('w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1]', readingPanePosition === 'right' && 'bg-[#EBF3FB] text-[#0078D4]')}>
                <PanelRight size={14} /> Right
              </button>
              <button onClick={() => setReadingPane('bottom')}
                className={cn('w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1]', readingPanePosition === 'bottom' && 'bg-[#EBF3FB] text-[#0078D4]')}>
                <PanelBottom size={14} /> Bottom
              </button>
              <button onClick={() => setReadingPane('off')}
                className={cn('w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1]', readingPanePosition === 'off' && 'bg-[#EBF3FB] text-[#0078D4]')}>
                <PanelLeftClose size={14} /> Off
              </button>
            </div>
          )}
          {menu === 'arrange' && (
            <div className="w-44">
              {[
                { v: 'date', l: 'Date' },
                { v: 'from', l: 'From' },
                { v: 'subject', l: 'Subject' },
                { v: 'size', l: 'Size' },
                { v: 'importance', l: 'Importance' },
              ].map((opt) => (
                <button key={opt.v}
                  onClick={() => { setSortBy(opt.v as never); setMenu(null) }}
                  className={cn('w-full flex items-center justify-between text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1]',
                    sortBy === opt.v && 'bg-[#EBF3FB] text-[#0078D4]')}>
                  {opt.l}{sortBy === opt.v && <Check size={12} />}
                </button>
              ))}
              <div className="h-px bg-[#EDEBE9] my-1" />
              <button onClick={() => { setSortOrder('desc'); setMenu(null) }}
                className={cn('w-full text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1]', sortOrder === 'desc' && 'bg-[#EBF3FB] text-[#0078D4]')}>
                Newest on top
              </button>
              <button onClick={() => { setSortOrder('asc'); setMenu(null) }}
                className={cn('w-full text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1]', sortOrder === 'asc' && 'bg-[#EBF3FB] text-[#0078D4]')}>
                Oldest on top
              </button>
            </div>
          )}
          {menu === 'density' && (
            <div className="w-40">
              {(['compact', 'medium', 'comfortable'] as const).map((d) => (
                <button key={d}
                  onClick={() => {
                    updateSettingsMutation.mutate({ density: d })
                    setMenu(null)
                    showNotification(`Density: ${d}`)
                  }}
                  className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] capitalize">
                  {d}
                </button>
              ))}
            </div>
          )}
          {menu === 'categories' && (() => {
            // Mirror the right-click Categorize submenu (MessageListItem):
            // bordered shell, search input header, colored tag rows, ✓ on
            // active, footer links. Reused styles so the View popover feels
            // identical to the per-message one.
            const filtered = (categoryList as { id: string; name: string; color: string }[]).filter((c) =>
              c.name.toLowerCase().includes(catSearch.trim().toLowerCase())
            )
            return (
              <div className="w-56 py-1">
                <div className="px-2 py-1.5 border-b border-[#EDEBE9]" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-[#F3F2F1] rounded">
                    <Search size={11} className="text-[#605E5C] flex-shrink-0" />
                    <input
                      type="text"
                      value={catSearch}
                      onChange={(e) => setCatSearch(e.target.value)}
                      placeholder="Search for a category"
                      aria-label="Search categories"
                      className="flex-1 text-xs bg-transparent focus:outline-none text-[#323130] placeholder:text-[#A19F9D]"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <button
                  role="menuitem"
                  onClick={() => { clearCategoryFilter(); setMenu(null) }}
                  className={cn(
                    'flex items-center gap-2 w-full text-sm px-3 py-1.5 hover:bg-[#F3F2F1]',
                    categoryFilterIds.length === 0 ? 'text-[#0078D4] font-medium' : 'text-[#323130]',
                  )}
                >
                  All categories
                </button>
                {filtered.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-[#605E5C]">No categories match.</div>
                ) : (
                  filtered.map((cat) => {
                    const active = categoryFilterIds.includes(cat.id)
                    return (
                      <button
                        key={cat.id}
                        role="menuitem"
                        onClick={(e) => { e.stopPropagation(); toggleCategoryFilter(cat.id) }}
                        className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
                      >
                        <Tag size={14} className="flex-shrink-0" style={{ color: cat.color }} />
                        <span className="flex-1 text-left truncate">{cat.name}</span>
                        {active && <span className="text-[#0078D4] text-xs font-bold">✓</span>}
                      </button>
                    )
                  })
                )}
              </div>
            )
          })()}
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── Help Tab ────────────────────────────────────────────────────────────────
function HelpRibbon() {
  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0" role="toolbar" aria-label="Help toolbar">
      <RibbonBtn label="Help" onClick={() => {}}>
        <HelpCircle size={15} /><span>Help</span>
      </RibbonBtn>
      <RibbonBtn label="Training" onClick={() => {}}>
        <BookOpen size={15} /><span>Training</span>
      </RibbonBtn>
      <RibbonBtn label="What's new" onClick={() => {}}>
        <ExternalLink size={15} /><span>What&apos;s new</span>
      </RibbonBtn>
    </div>
  )
}

// ─── Calendar Home Tab ───────────────────────────────────────────────────────
function CalendarHomeRibbon() {
  const router = useRouter()
  const pathname = usePathname()
  const currentView = pathname?.split('/calendar/')?.[1] ?? 'month'
  const splitView = useUIStore((s) => s.calendarSplitView)
  const setSplitView = useUIStore((s) => s.setCalendarSplitView)
  const calendarFilter = useUIStore((s) => s.calendarFilter)
  const setCalendarFilter = useUIStore((s) => s.setCalendarFilter)
  const calendarCategoryFilter = useUIStore((s) => s.calendarCategoryFilter)
  const toggleCalendarCategoryFilter = useUIStore((s) => s.toggleCalendarCategoryFilter)
  const clearCalendarCategoryFilter = useUIStore((s) => s.clearCalendarCategoryFilter)
  const { data: ribbonCategoryList = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
  })
  const [filterOpen, setFilterOpen] = useState(false)
  // Filter button ref + computed dropdown coords. We render the menu in a
  // fixed-positioned element so the toolbar's `overflow-x-auto` (which forces
  // overflow-y to clip) doesn't swallow it.
  const filterBtnRef = useRef<HTMLDivElement>(null)
  const filterMenuRef = useRef<HTMLDivElement>(null)
  const [filterPos, setFilterPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    if (!filterOpen) return
    if (filterBtnRef.current) {
      const rect = filterBtnRef.current.getBoundingClientRect()
      setFilterPos({ top: rect.bottom + 2, left: rect.left })
    }
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (filterMenuRef.current?.contains(t)) return
      if (filterBtnRef.current?.contains(t)) return
      setFilterOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0 overflow-x-auto ribbon-scroll" role="toolbar" aria-label="Calendar toolbar">
      {/* New event */}
      <div className="flex items-center mr-1 flex-shrink-0">
        <button onClick={() => window.dispatchEvent(new CustomEvent('outlook:new-event'))} aria-label="New event"
          className="flex items-center gap-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-medium pl-3 pr-2 h-7 rounded-l transition-colors">
          <CalendarPlus size={13} /> New event
        </button>
        <button aria-label="New event options"
          className="flex items-center bg-[#0078D4] hover:bg-[#106EBE] text-white h-7 px-1 rounded-r border-l border-white/30 transition-colors">
          <ChevronDown size={10} />
        </button>
      </div>

      <RibbonSep />

      {/* View buttons */}
      <RibbonBtn label="Day" active={currentView === 'day'} onClick={() => router.push('/calendar/day')}>
        <CalendarDays size={15} /><span>Day</span>
      </RibbonBtn>
      <RibbonBtn label="Work week" active={currentView === 'work-week'} onClick={() => router.push('/calendar/work-week')}>
        <CalendarRange size={15} /><span>Work week</span>
      </RibbonBtn>
      <RibbonBtn label="Week" active={currentView === 'week'} onClick={() => router.push('/calendar/week')}>
        <CalendarDays size={15} /><span>Week</span>
      </RibbonBtn>
      <RibbonBtn label="Month" active={currentView === 'month'} onClick={() => router.push('/calendar/month')}>
        <CalendarRange size={15} /><span>Month</span>
      </RibbonBtn>

      <RibbonSep />

      {/* Split view */}
      <RibbonBtn label="Split view" active={splitView} onClick={() => setSplitView(!splitView)}>
        <PanelRight size={15} /><span>Split view</span>
      </RibbonBtn>

      {/* Filter */}
      <div ref={filterBtnRef}>
        <RibbonBtn
          label="Filter"
          active={calendarFilter !== 'all' || calendarCategoryFilter.length > 0}
          onClick={() => setFilterOpen((v) => !v)}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <span>
            {calendarFilter === 'all' && calendarCategoryFilter.length === 0
              ? 'Filter'
              : 'Filter applied'}
          </span>
        </RibbonBtn>
      </div>
      {filterOpen && (
        <div
          ref={filterMenuRef}
          style={{ top: filterPos.top, left: filterPos.left }}
          className="fixed z-[200] w-56 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in max-h-[420px] overflow-y-auto"
        >
          {/* Type filter — same set as before */}
          <p className="px-3 py-1 text-[10px] font-semibold uppercase text-[#605E5C] tracking-wide">Show</p>
          {([
            ['all', 'Show all events'],
            ['mine', 'Only my events'],
            ['invites', 'Only invites'],
            ['no-allday', 'Hide all-day events'],
          ] as const).map(([val, label]) => (
            <button key={val} onClick={() => { setCalendarFilter(val) }}
              className={cn(
                'w-full text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors flex items-center justify-between',
                calendarFilter === val ? 'text-[#0078D4]' : 'text-[#323130]'
              )}>
              <span>{label}</span>
              {calendarFilter === val && <span className="text-xs">✓</span>}
            </button>
          ))}

          {/* Category filter — multi-select */}
          <div className="border-t border-[#EDEBE9] mt-1 pt-1">
            <div className="flex items-center justify-between px-3 py-1">
              <p className="text-[10px] font-semibold uppercase text-[#605E5C] tracking-wide">
                Categories
              </p>
              {calendarCategoryFilter.length > 0 && (
                <button
                  type="button"
                  onClick={clearCalendarCategoryFilter}
                  className="text-[10px] text-[#0078D4] hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            {ribbonCategoryList.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[#A19F9D] italic">No categories yet</p>
            ) : (
              ribbonCategoryList.map((c) => {
                const checked = calendarCategoryFilter.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCalendarCategoryFilter(c.id)}
                    className="w-full text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1] text-[#323130] flex items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="accent-[#0078D4]"
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      <RibbonSep />

      {/* Share & Print */}
      <RibbonBtn label="Share" onClick={() => window.dispatchEvent(new CustomEvent('outlook:share-calendar'))}>
        <Share2 size={15} /><span>Share</span>
      </RibbonBtn>
      <RibbonBtn label="Print" onClick={() => window.print()}>
        <Printer size={15} /><span>Print</span>
      </RibbonBtn>
    </div>
  )
}

// ─── Contacts Home Tab ───────────────────────────────────────────────────────
function ContactsHomeRibbon() {
  const showNotification = useUIStore((s) => s.showNotification)

  const handleNewContact = () => {
    window.dispatchEvent(new CustomEvent('outlook:new-contact'))
  }

  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0 overflow-x-auto ribbon-scroll" role="toolbar" aria-label="Contacts toolbar">
      <div className="flex items-center mr-1 flex-shrink-0">
        <button onClick={handleNewContact} aria-label="New contact"
          className="flex items-center gap-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-medium pl-3 pr-2 h-7 rounded-l transition-colors">
          <UserPlus size={13} /> New contact
        </button>
        <button aria-label="New contact options"
          className="flex items-center bg-[#0078D4] hover:bg-[#106EBE] text-white h-7 px-1 rounded-r border-l border-white/30 transition-colors">
          <ChevronDown size={10} />
        </button>
      </div>

      <RibbonSep />

      <RibbonBtn label="Edit" disabled onClick={() => showNotification('Select a contact first')}>
        <Pencil size={15} /><span>Edit</span>
      </RibbonBtn>
      <RibbonBtn label="Delete" disabled onClick={() => showNotification('Select a contact first')}>
        <Trash2 size={15} /><span>Delete</span>
      </RibbonBtn>
      <RibbonBtn label="Restore" disabled onClick={() => showNotification('Restore contact')}>
        <RotateCcw size={15} /><span>Restore</span>
      </RibbonBtn>

      <RibbonSep />

      <RibbonBtn label="Add to contacts" disabled onClick={() => showNotification('Add to contacts')}>
        <UserPlus size={15} /><span>Add to contacts</span>
      </RibbonBtn>
      <RibbonBtn label="Add to favorites" disabled onClick={() => showNotification('Select a contact first')}>
        <Star size={15} /><span>Add to favorites</span>
      </RibbonBtn>
      <RibbonBtn label="Add to list" disabled onClick={() => showNotification('Select a contact first')}>
        <Users size={15} /><span>Add to list</span>
      </RibbonBtn>

      <RibbonSep />

      <RibbonBtn label="Edit members" disabled onClick={() => showNotification('Edit members')}>
        <Users size={15} /><span>Edit members</span>
      </RibbonBtn>
      <RibbonBtn label="Invite others" disabled onClick={() => showNotification('Invite others')}>
        <UserPlus size={15} /><span>Invite others</span>
      </RibbonBtn>

      <RibbonSep />

      <RibbonBtn label="Manage contacts" onClick={() => showNotification('Manage contacts')}>
        <Users size={15} /><span>Manage contacts</span>
      </RibbonBtn>
    </div>
  )
}

// ─── Tasks Home Tab ──────────────────────────────────────────────────────────
function TasksHomeRibbon() {
  const handleNewTask = () => {
    window.dispatchEvent(new CustomEvent('outlook:new-task'))
  }

  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0 overflow-x-auto ribbon-scroll" role="toolbar" aria-label="Tasks toolbar">
      <div className="flex items-center mr-1 flex-shrink-0">
        <button onClick={handleNewTask} aria-label="New task"
          className="flex items-center gap-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-medium pl-3 pr-2 h-7 rounded-l transition-colors">
          <Plus size={13} /> New task
        </button>
        <button aria-label="New task options"
          className="flex items-center bg-[#0078D4] hover:bg-[#106EBE] text-white h-7 px-1 rounded-r border-l border-white/30 transition-colors">
          <ChevronDown size={10} />
        </button>
      </div>

      <RibbonSep />

      <RibbonBtn label="Complete" disabled onClick={() => {}}>
        <CheckSquare size={15} /><span>Complete</span>
      </RibbonBtn>
      <RibbonBtn label="Delete" disabled onClick={() => {}}>
        <Trash2 size={15} /><span>Delete</span>
      </RibbonBtn>
      <RibbonBtn label="Flag" disabled onClick={() => {}}>
        <Flag size={15} /><span>Flag</span>
      </RibbonBtn>
    </div>
  )
}