'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { settings } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { SpinnerOverlay } from '@/components/ui/Spinner'

const schema = z.object({
  enabled: z.boolean(),
  start: z.string().optional(),
  end: z.string().optional(),
  message_internal: z.string().optional(),
  message_external: z.string().optional(),
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
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: oof
      ? {
          enabled: oof.enabled,
          start: oof.start?.slice(0, 16) ?? '',
          end: oof.end?.slice(0, 16) ?? '',
          message_internal: oof.message_internal ?? '',
          message_external: oof.message_external ?? '',
        }
      : undefined,
  })

  const enabled = watch('enabled')

  const saveMutation = useMutation({
    mutationFn: (data: FormValues) =>
      settings.updateOOF({
        enabled: data.enabled,
        start: data.start ? new Date(data.start).toISOString() : null,
        end: data.end ? new Date(data.end).toISOString() : null,
        message_internal: data.message_internal ?? null,
        message_external: data.message_external ?? null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings-oof'] }),
  })

  if (isLoading) return <SpinnerOverlay />

  return (
    <div className="max-w-xl p-6">
      <h2 className="text-lg font-semibold text-[#323130] mb-1">Automatic replies</h2>
      <p className="text-sm text-[#605E5C] mb-6">
        Send automatic replies when you&apos;re out of office.
      </p>

      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-5">
        {/* Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              aria-label="Enable automatic replies"
              {...register('enabled')}
            />
            <div
              className={`w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-[#0078D4]' : 'bg-[#D2D0CE]'}`}
            />
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </div>
          <span className="text-sm font-medium text-[#323130]">
            {enabled ? 'Automatic replies on' : 'Automatic replies off'}
          </span>
        </label>

        {enabled && (
          <>
            {/* Date range */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#323130]">Date range (optional)</p>
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs text-[#605E5C] mb-1" htmlFor="oof-start">
                    Start
                  </label>
                  <input
                    id="oof-start"
                    type="datetime-local"
                    aria-label="Out of office start date"
                    className="text-sm border border-[#EDEBE9] rounded px-2 py-1.5 text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
                    {...register('start')}
                  />
                </div>
                <span className="text-[#605E5C] mt-4">→</span>
                <div>
                  <label className="block text-xs text-[#605E5C] mb-1" htmlFor="oof-end">
                    End
                  </label>
                  <input
                    id="oof-end"
                    type="datetime-local"
                    aria-label="Out of office end date"
                    className="text-sm border border-[#EDEBE9] rounded px-2 py-1.5 text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
                    {...register('end')}
                  />
                </div>
              </div>
            </div>

            {/* Internal message */}
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1" htmlFor="oof-internal">
                Reply to people inside my organization
              </label>
              <textarea
                id="oof-internal"
                rows={4}
                aria-label="Out of office message for internal senders"
                className="w-full border border-[#8A8886] rounded px-3 py-2 text-sm text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4] resize-none placeholder:text-[#A19F9D]"
                placeholder="I'm out of office..."
                {...register('message_internal')}
              />
            </div>

            {/* External message */}
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1" htmlFor="oof-external">
                Reply to people outside my organization
              </label>
              <textarea
                id="oof-external"
                rows={4}
                aria-label="Out of office message for external senders"
                className="w-full border border-[#8A8886] rounded px-3 py-2 text-sm text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4] resize-none placeholder:text-[#A19F9D]"
                placeholder="I'm out of office..."
                {...register('message_external')}
              />
            </div>
          </>
        )}

        <Button
          type="submit"
          loading={isSubmitting || saveMutation.isPending}
          aria-label="Save automatic replies settings"
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
