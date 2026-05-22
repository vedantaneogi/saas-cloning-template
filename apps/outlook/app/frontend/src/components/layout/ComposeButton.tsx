
import { Plus, ChevronDown } from 'lucide-react'
import { useUIStore } from '@/store/ui'

export function ComposeButton() {
  const openComposer = useUIStore((s) => s.openComposer)

  return (
    <div className="flex h-9 mb-3">
      <button
        onClick={() => openComposer()}
        aria-label="New mail"
        data-automation-id="splitbuttonprimary"
        className="flex items-center gap-1.5 bg-white hover:bg-[#F3F2F1] active:bg-[#EDEBE9] text-[#323130] text-sm font-medium px-3 rounded-l border border-r-0 border-[#D2D0CE] transition-colors flex-1"
      >
        <Plus size={16} className="text-[#0078D4]" />
        New mail
      </button>
      <button
        aria-label="More new item options"
        className="px-2 bg-white hover:bg-[#F3F2F1] active:bg-[#EDEBE9] text-[#605E5C] rounded-r border border-[#D2D0CE] transition-colors"
      >
        <ChevronDown size={14} />
      </button>
    </div>
  )
}
