'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contacts } from '@/lib/api'
import type { Contact } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  display_name: z.string().min(1, 'Display name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  company: z.string().optional(),
  job_title: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface ContactFormProps {
  contact?: Contact
  onSuccess?: () => void
  onCancel?: () => void
}

export function ContactForm({ contact, onSuccess, onCancel }: ContactFormProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: contact
      ? {
          first_name: contact.first_name,
          last_name: contact.last_name ?? '',
          display_name: contact.display_name,
          email: contact.email,
          phone: contact.phone ?? '',
          company: contact.company ?? '',
          job_title: contact.job_title ?? '',
          notes: contact.notes ?? '',
        }
      : undefined,
  })

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      if (contact) {
        return contacts.update(contact.id, data)
      }
      return contacts.create(data)
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['contacts'] })
      onSuccess?.()
    },
  })

  return (
    <form
      onSubmit={handleSubmit((d) => mutation.mutate(d))}
      className="p-6 space-y-4"
      aria-label={contact ? 'Edit contact form' : 'New contact form'}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#605E5C] mb-1" htmlFor="first_name">
            First name *
          </label>
          <Input
            id="first_name"
            aria-label="First name"
            error={!!errors.first_name}
            {...register('first_name')}
          />
          {errors.first_name && (
            <p className="text-xs text-[#D13438] mt-1">{errors.first_name.message}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-[#605E5C] mb-1" htmlFor="last_name">
            Last name
          </label>
          <Input id="last_name" aria-label="Last name" {...register('last_name')} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#605E5C] mb-1" htmlFor="display_name">
          Display name *
        </label>
        <Input
          id="display_name"
          aria-label="Display name"
          error={!!errors.display_name}
          {...register('display_name')}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#605E5C] mb-1" htmlFor="email">
          Email *
        </label>
        <Input
          id="email"
          type="email"
          aria-label="Email"
          error={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-[#D13438] mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-[#605E5C] mb-1" htmlFor="phone">
          Phone
        </label>
        <Input id="phone" type="tel" aria-label="Phone" {...register('phone')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#605E5C] mb-1" htmlFor="company">
            Company
          </label>
          <Input id="company" aria-label="Company" {...register('company')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#605E5C] mb-1" htmlFor="job_title">
            Job title
          </label>
          <Input id="job_title" aria-label="Job title" {...register('job_title')} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#605E5C] mb-1" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          aria-label="Notes"
          rows={3}
          className="w-full border border-[#8A8886] rounded px-3 py-1.5 text-sm text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] resize-none placeholder:text-[#A19F9D]"
          {...register('notes')}
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" loading={isSubmitting || mutation.isPending}>
          {contact ? 'Save changes' : 'Create contact'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {mutation.isError && (
          <p className="text-xs text-[#D13438]">
            {mutation.error instanceof Error ? mutation.error.message : 'Failed to save'}
          </p>
        )}
      </div>
    </form>
  )
}
