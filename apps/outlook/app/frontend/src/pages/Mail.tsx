import { useEffect } from 'react'
import { useParams, useSearchParams } from '@/lib/next-compat'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useQuery } from '@tanstack/react-query'
import { FolderTree } from '@/components/mail/FolderTree'
import { MessageList } from '@/components/mail/MessageList'
import { ReadingPane } from '@/components/mail/ReadingPane'
import { useMailStore } from '@/store/mail'
import { settings } from '@/lib/api'

/**
 * Mail surface — folder tree + message list + reading pane.
 * Ported from `apps/web/src/app/(app)/mail/[folder]/page.tsx`.
 */
export function Mail() {
  const params = useParams<{ folder: string }>()
  const folder = params?.folder ?? 'inbox'
  const searchParams = useSearchParams()
  const deepLinkMsgId = searchParams?.get('msg_id') ?? null
  const setSelectedFolderSlug = useMailStore((s) => s.setSelectedFolderSlug)
  const setSelectedMessageId = useMailStore((s) => s.setSelectedMessageId)

  const { data: appSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settings.get(),
    staleTime: 60000,
  })

  const readingPanePosition = appSettings?.reading_pane_position ?? 'right'
  const clearSelection = useMailStore((s) => s.clearSelection)

  useEffect(() => {
    if (folder) {
      setSelectedFolderSlug(folder)
      if (deepLinkMsgId) {
        setSelectedMessageId(deepLinkMsgId)
      } else {
        setSelectedMessageId(null)
      }
      clearSelection()
    }
  }, [folder, deepLinkMsgId, setSelectedFolderSlug, setSelectedMessageId, clearSelection])

  const resizeHandleH = (
    <PanelResizeHandle className="w-1 bg-[#EDEBE9] hover:bg-[#0078D4] transition-colors cursor-col-resize" />
  )
  const resizeHandleV = (
    <PanelResizeHandle className="h-1 bg-[#EDEBE9] hover:bg-[#0078D4] transition-colors cursor-row-resize" />
  )

  if (readingPanePosition === 'off') {
    return (
      <div data-testid="mail-page" className="flex flex-col h-full overflow-hidden">
        <PanelGroup direction="horizontal" className="flex-1 overflow-hidden" aria-label="Mail layout">
          <Panel defaultSize={20} minSize={14} maxSize={32}>
            <div className="h-full overflow-hidden"><FolderTree /></div>
          </Panel>
          {resizeHandleH}
          <Panel defaultSize={80} minSize={40}>
            <div className="h-full overflow-hidden"><MessageList /></div>
          </Panel>
        </PanelGroup>
      </div>
    )
  }

  if (readingPanePosition === 'bottom') {
    return (
      <div data-testid="mail-page" className="flex flex-col h-full overflow-hidden">
        <PanelGroup direction="horizontal" className="flex-1 overflow-hidden" aria-label="Mail layout">
          <Panel defaultSize={18} minSize={12} maxSize={30}>
            <div className="h-full overflow-hidden"><FolderTree /></div>
          </Panel>
          {resizeHandleH}
          <Panel defaultSize={82} minSize={50}>
            <PanelGroup direction="vertical" className="h-full">
              <Panel defaultSize={38} minSize={20}>
                <div className="h-full overflow-hidden"><MessageList /></div>
              </Panel>
              {resizeHandleV}
              <Panel defaultSize={62} minSize={25}>
                <div className="h-full overflow-hidden"><ReadingPane /></div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    )
  }

  // Default: reading pane on right
  return (
    <div data-testid="mail-page" className="flex flex-col h-full overflow-hidden">
      <PanelGroup direction="horizontal" className="flex-1 overflow-hidden" aria-label="Mail layout">
        <Panel defaultSize={18} minSize={12} maxSize={30}>
          <div className="h-full overflow-hidden"><FolderTree /></div>
        </Panel>
        {resizeHandleH}
        <Panel defaultSize={30} minSize={20} maxSize={50}>
          <div className="h-full overflow-hidden"><MessageList /></div>
        </Panel>
        {resizeHandleH}
        <Panel defaultSize={52} minSize={30}>
          <div className="h-full overflow-hidden"><ReadingPane /></div>
        </Panel>
      </PanelGroup>
    </div>
  )
}
