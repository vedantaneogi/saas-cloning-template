'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { settings } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { SpinnerOverlay } from '@/components/ui/Spinner'

interface FormValues {
  timezone: string
  locale: string
  theme: 'light' | 'dark'
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

export function GeneralSettings() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settings.get(),
  })

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { timezone: 'UTC', locale: 'en-US', theme: 'light' },
  })

  useEffect(() => {
    if (data) reset({
      timezone: data.timezone ?? data.general?.timezone ?? 'UTC',
      locale: data.locale ?? data.general?.locale ?? 'en-US',
      theme: (data.general?.theme as 'light' | 'dark') ?? data.theme ?? 'light',
    })
  }, [data, reset])

  const saveMutation = useMutation({
    mutationFn: (d: FormValues) => settings.update({ general: { timezone: d.timezone, locale: d.locale, theme: d.theme } } as never),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  if (isLoading) return <SpinnerOverlay />

  return (
    <div className="max-w-xl p-6">
      <h2 className="text-lg font-semibold text-[#323130] mb-1">General settings</h2>
      <p className="text-sm text-[#605E5C] mb-6">Configure your account preferences.</p>

      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#605E5C] mb-1" htmlFor="timezone">
            Timezone
          </label>
          <select
            id="timezone"
            aria-label="Timezone"
            className="w-full text-sm border border-[#8A8886] rounded px-3 py-2 text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
            {...register('timezone')}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#605E5C] mb-1" htmlFor="locale">
            Language
          </label>
          <select
            id="locale"
            aria-label="Language"
            className="w-full text-sm border border-[#8A8886] rounded px-3 py-2 text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
            {...register('locale')}
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
            <option value="es-ES">Spanish</option>
            <option value="ja-JP">Japanese</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#605E5C] mb-1" htmlFor="theme">
            Theme
          </label>
          <select
            id="theme"
            aria-label="Theme"
            className="w-full text-sm border border-[#8A8886] rounded px-3 py-2 text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
            {...register('theme')}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <Button
          type="submit"
          loading={isSubmitting || saveMutation.isPending}
          aria-label="Save general settings"
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
