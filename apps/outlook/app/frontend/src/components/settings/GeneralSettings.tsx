
import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { settings } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
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

const LOCALES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'ja-JP', label: 'Japanese' },
]

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function GeneralSettings() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settings.get(),
  })

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
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
          <label className="block text-sm font-medium text-[#605E5C] mb-1">Timezone</label>
          <Controller
            name="timezone"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
                ariaLabel="Timezone"
                className="w-full"
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#605E5C] mb-1">Language</label>
          <Controller
            name="locale"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={LOCALES}
                ariaLabel="Language"
                className="w-full"
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#605E5C] mb-1">Theme</label>
          <Controller
            name="theme"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={(v) => field.onChange(v as 'light' | 'dark')}
                options={THEMES}
                ariaLabel="Theme"
                className="w-full"
              />
            )}
          />
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
