
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { settings } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { SpinnerOverlay } from '@/components/ui/Spinner'
import { useMailStore } from '@/store/mail'

interface FormValues {
  reading_pane_position: 'right' | 'bottom' | 'off'
  conversation_grouping: boolean
  focused_inbox: boolean
}

export function MailSettings() {
  const queryClient = useQueryClient()
  const setConversationGrouping = useMailStore((s) => s.setConversationGrouping)
  const setFocusedInbox = useMailStore((s) => s.setFocusedInbox)
  const setReadingPanePosition = useMailStore((s) => s.setReadingPanePosition)

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settings.get(),
  })

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    values: data
      ? {
          reading_pane_position: data.reading_pane_position,
          conversation_grouping: data.conversation_grouping,
          focused_inbox: data.focused_inbox,
        }
      : undefined,
  })

  const saveMutation = useMutation({
    mutationFn: (d: FormValues) => settings.update(d),
    onSuccess: (_, d) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setConversationGrouping(d.conversation_grouping)
      setFocusedInbox(d.focused_inbox)
      setReadingPanePosition(d.reading_pane_position)
    },
  })

  if (isLoading) return <SpinnerOverlay />

  return (
    <div className="max-w-xl p-6">
      <h2 className="text-lg font-semibold text-[#323130] mb-1">Mail settings</h2>
      <p className="text-sm text-[#605E5C] mb-6">Customize your mail layout and behavior.</p>

      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-5">
        {/* Reading pane */}
        <fieldset>
          <legend className="text-sm font-medium text-[#323130] mb-2">Reading pane</legend>
          <div className="space-y-2">
            {(['right', 'bottom', 'off'] as const).map((pos) => (
              <label key={pos} className="flex items-center gap-2 text-sm text-[#323130] cursor-pointer">
                <input
                  type="radio"
                  value={pos}
                  aria-label={`Reading pane ${pos}`}
                  className="text-[#0078D4]"
                  {...register('reading_pane_position')}
                />
                {pos === 'right' && 'Show on the right'}
                {pos === 'bottom' && 'Show at the bottom'}
                {pos === 'off' && 'Hide reading pane'}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Conversation grouping */}
        <div>
          <label className="flex items-center gap-2 text-sm text-[#323130] cursor-pointer">
            <input
              type="checkbox"
              aria-label="Group messages by conversation"
              className="rounded border-[#D2D0CE]"
              {...register('conversation_grouping')}
            />
            Group messages by conversation
          </label>
        </div>

        {/* Focused inbox */}
        <div>
          <label className="flex items-center gap-2 text-sm text-[#323130] cursor-pointer">
            <input
              type="checkbox"
              aria-label="Focused inbox"
              className="rounded border-[#D2D0CE]"
              {...register('focused_inbox')}
            />
            Focused inbox (separate important email)
          </label>
        </div>

        <Button
          type="submit"
          loading={isSubmitting || saveMutation.isPending}
          aria-label="Save mail settings"
        >
          Save
        </Button>

        {saveMutation.isSuccess && (
          <p className="text-xs text-[#107C10]">Settings saved.</p>
        )}
      </form>
    </div>
  )
}
