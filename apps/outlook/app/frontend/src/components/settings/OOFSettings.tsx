
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { settings } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { SpinnerOverlay } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'

const schema = z.object({
  enabled: z.boolean(),
  time_limited: z.boolean(),
  start: z.string().optional(),
  end: z.string().optional(),
  message_internal: z.string().optional(),
  message_external: z.string().optional(),
  contacts_only: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function OOFSettings() {
  const queryClient = useQueryClient()

  const { data: oof, isLoading } = useQuery({
    queryKey: ['settings-oof'],
    queryFn: () => settings.getOOF(),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: oof
      ? {
          enabled: oof.enabled,
          time_limited: !!(oof.start && oof.end),
          start: oof.start?.slice(0, 16) ?? '',
          end: oof.end?.slice(0, 16) ?? '',
          message_internal: oof.internal_message ?? '',
          message_external: oof.external_message ?? '',
          contacts_only: false,
        }
      : { enabled: false, time_limited: false, start: '', end: '', message_internal: '', message_external: '', contacts_only: false },
  })

  const enabled = watch('enabled')
  const timeLimited = watch('time_limited')

  const saveMutation = useMutation({
    mutationFn: (data: FormValues) =>
      settings.updateOOF({
        enabled: data.enabled,
        start: data.time_limited && data.start ? new Date(data.start).toISOString() : null,
        end: data.time_limited && data.end ? new Date(data.end).toISOString() : null,
        internal_message: data.message_internal ?? null,
        external_message: data.message_external ?? null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings-oof'] }),
  })

  if (isLoading) return <SpinnerOverlay />

  return (
    <div className="max-w-2xl p-8">
      <h2 className="text-xl font-semibold text-[#323130] mb-1">Automatic replies</h2>
      <p className="text-sm text-[#605E5C] mb-6">
        Use automatic replies to let others know you&apos;re on vacation or aren&apos;t available to respond to email. You can set your replies to start and end at a specific time. Otherwise, they&apos;ll continue until you turn them off.
      </p>

      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-6">
        {/* Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Automatic replies toggle"
            onClick={() => setValue('enabled', !enabled)}
            className={cn(
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:ring-offset-1',
              enabled ? 'bg-[#0078D4]' : 'bg-[#D2D0CE]'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200',
                enabled ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
          <span className="text-sm font-medium text-[#323130]">
            {enabled ? 'Automatic replies on' : 'Automatic replies off'}
          </span>
        </div>

        {/* Send replies only during a time period */}
        <label className="flex items-center gap-2 text-sm text-[#323130] cursor-pointer">
          <input
            type="checkbox"
            checked={timeLimited}
            onChange={(e) => setValue('time_limited', e.target.checked)}
            className="rounded border-[#D2D0CE]"
          />
          Send replies only during a time period
        </label>

        {/* Date/time pickers — shown when time_limited is checked */}
        <div className={cn('space-y-3 pl-6', !timeLimited && 'opacity-50 pointer-events-none')}>
          <div className="flex items-center gap-3">
            <label className="text-sm text-[#605E5C] w-20">Start time</label>
            <input
              type="date"
              className="text-sm border border-[#8A8886] rounded px-2 py-1.5 text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
              {...register('start')}
            />
            <input
              type="time"
              defaultValue="09:00"
              className="text-sm border border-[#8A8886] rounded px-2 py-1.5 text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-[#605E5C] w-20">End time</label>
            <input
              type="date"
              className="text-sm border border-[#8A8886] rounded px-2 py-1.5 text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
              {...register('end')}
            />
            <input
              type="time"
              defaultValue="09:00"
              className="text-sm border border-[#8A8886] rounded px-2 py-1.5 text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
            />
          </div>
        </div>

        {/* Rich text formatting toolbar + message body */}
        <div>
          <div className="flex items-center gap-0.5 border border-[#EDEBE9] border-b-0 rounded-t px-2 py-1.5 bg-[#FAF9F8]">
            {/* Mini formatting toolbar icons matching Outlook */}
            {['B', 'I', 'U'].map((l) => (
              <button key={l} type="button" className="w-6 h-6 flex items-center justify-center text-xs font-bold text-[#323130] hover:bg-[#EDEBE9] rounded transition-colors">
                {l}
              </button>
            ))}
            <span className="w-px h-4 bg-[#EDEBE9] mx-0.5" />
            <button type="button" className="w-6 h-6 flex items-center justify-center text-[#605E5C] hover:bg-[#EDEBE9] rounded transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M2 6h6M2 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </button>
            <button type="button" className="w-6 h-6 flex items-center justify-center text-[#605E5C] hover:bg-[#EDEBE9] rounded transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M3 6h6M4 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </button>
          </div>
          <textarea
            rows={4}
            aria-label="Internal message — sent to people in your organisation"
            className="w-full border border-[#EDEBE9] rounded-b px-3 py-2 text-sm text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4] resize-none placeholder:text-[#A19F9D]"
            placeholder="Internal reply — sent to people in your organisation"
            {...register('message_internal')}
          />
        </div>

        {/* External (out-of-org) reply — Outlook splits these in two boxes */}
        <div>
          <label className="block text-sm font-medium text-[#323130] mb-1">
            Reply to people outside your organisation
          </label>
          <textarea
            rows={4}
            aria-label="External message — sent to people outside your organisation"
            className="w-full border border-[#EDEBE9] rounded px-3 py-2 text-sm text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4] resize-none placeholder:text-[#A19F9D]"
            placeholder="I'm currently out of office and will respond when I return."
            {...register('message_external')}
          />
          <p className="text-xs text-[#605E5C] mt-1">
            Leave blank to use the same message for everyone.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" loading={isSubmitting || saveMutation.isPending}>
            Save
          </Button>
          {saveMutation.isSuccess && (
            <span className="text-sm text-[#107C10]">Settings saved.</span>
          )}
        </div>
      </form>
    </div>
  )
}