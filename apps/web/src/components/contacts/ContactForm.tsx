'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contacts } from '@/lib/api'
import type { Contact } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { X, User, Mail, MessageSquare, Phone, MapPin, Building2, Tag, AlignLeft, Camera, Plus } from 'lucide-react'

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  display_name: z.string().optional().default(''),
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

// Underline-style input matching Outlook contact form
function UnderlineInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs text-[#605E5C] mb-0.5">{label}</label>
      <input
        {...props}
        className="w-full border-0 border-b border-[#EDEBE9] px-0 py-1.5 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent placeholder:text-[#A19F9D] transition-colors"
      />
    </div>
  )
}

function AddFieldButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-[#0078D4] hover:underline py-1 transition-colors">
      <Plus size={13} /> {label}
    </button>
  )
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
      // Auto-generate display_name from first + last
      if (!data.display_name || data.display_name.trim() === '') {
        data.display_name = [data.first_name, data.last_name].filter(Boolean).join(' ')
      }
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
      className="flex flex-col h-full"
      aria-label={contact ? 'Edit contact form' : 'New contact form'}
    >
      {/* Close button */}
      {onCancel && (
        <div className="flex justify-end p-3 pb-0">
          <button type="button" onClick={onCancel} aria-label="Close" className="p-1 text-[#605E5C] hover:bg-[#F3F2F1] rounded">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto outlook-scrollbar px-6 pb-6 space-y-5">
        {/* Name section — avatar + first/last name */}
        <div className="flex items-start gap-4 pt-2">
          <span className="w-5 text-[#605E5C] mt-6 flex-shrink-0">
            <User size={16} />
          </span>
          <div className="w-16 h-16 rounded-full bg-[#EDEBE9] flex items-center justify-center flex-shrink-0 mt-1">
            <Camera size={20} className="text-[#A19F9D]" />
          </div>
          <div className="flex-1 space-y-2">
            <UnderlineInput label="First name" {...register('first_name')} placeholder="" />
            {errors.first_name && <p className="text-xs text-[#D13438]">{errors.first_name.message}</p>}
            <UnderlineInput label="Last name" {...register('last_name')} placeholder="" />
          </div>
        </div>
        <div className="pl-9">
          <AddFieldButton label="Add name field" />
        </div>

        {/* Email section */}
        <div className="flex items-start gap-4">
          <span className="w-5 text-[#605E5C] mt-5 flex-shrink-0">
            <Mail size={16} />
          </span>
          <div className="flex-1 space-y-2">
            <UnderlineInput label="Email address" type="email" {...register('email')} placeholder="" />
            {errors.email && <p className="text-xs text-[#D13438]">{errors.email.message}</p>}
            <AddFieldButton label="Add email" />
          </div>
        </div>

        {/* Chat section */}
        <div className="flex items-start gap-4">
          <span className="w-5 text-[#605E5C] mt-1 flex-shrink-0">
            <MessageSquare size={16} />
          </span>
          <div className="flex-1">
            <AddFieldButton label="Add chat" />
          </div>
        </div>

        {/* Phone section */}
        <div className="flex items-start gap-4">
          <span className="w-5 text-[#605E5C] mt-5 flex-shrink-0">
            <Phone size={16} />
          </span>
          <div className="flex-1 space-y-2">
            <UnderlineInput label="Mobile phone number" type="tel" {...register('phone')} placeholder="" />
            <AddFieldButton label="Add phone" />
          </div>
        </div>

        {/* Address section */}
        <div className="flex items-start gap-4">
          <span className="w-5 text-[#605E5C] mt-1 flex-shrink-0">
            <MapPin size={16} />
          </span>
          <div className="flex-1">
            <AddFieldButton label="Add address" />
          </div>
        </div>

        {/* Company section */}
        <div className="flex items-start gap-4">
          <span className="w-5 text-[#605E5C] mt-5 flex-shrink-0">
            <Building2 size={16} />
          </span>
          <div className="flex-1 space-y-2">
            <UnderlineInput label="Company" {...register('company')} placeholder="" />
            <AddFieldButton label="Add work field" />
          </div>
        </div>

        {/* Categorize section */}
        <div className="flex items-start gap-4">
          <span className="w-5 text-[#605E5C] mt-1 flex-shrink-0">
            <Tag size={16} />
          </span>
          <div className="flex-1">
            <AddFieldButton label="Categorize" />
          </div>
        </div>

        {/* Add others */}
        <div className="flex items-start gap-4">
          <span className="w-5 text-[#605E5C] mt-1 flex-shrink-0">
            <AlignLeft size={16} />
          </span>
          <div className="flex-1">
            <AddFieldButton label="Add others" />
          </div>
        </div>

        {/* Notes section */}
        <div className="flex items-start gap-4">
          <span className="w-5 text-[#605E5C] mt-5 flex-shrink-0">
            <MessageSquare size={16} />
          </span>
          <div className="flex-1">
            <label className="block text-xs text-[#605E5C] mb-0.5">Notes</label>
            <textarea
              rows={3}
              className="w-full border-0 border-b border-[#EDEBE9] px-0 py-1.5 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent resize-none placeholder:text-[#A19F9D]"
              {...register('notes')}
            />
          </div>
        </div>

        {/* Hidden fields for form data */}
        <input type="hidden" {...register('display_name')} value="" />
      </div>

      {/* Footer buttons */}
      <div className="flex items-center gap-2 px-6 py-4 border-t border-[#EDEBE9] flex-shrink-0">
        <Button type="submit" loading={isSubmitting || mutation.isPending} disabled={isSubmitting || mutation.isPending}>
          Save
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