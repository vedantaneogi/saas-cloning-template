'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export default function SignInPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    setServerError(null)
    try {
      const res = await auth.login(data.email, data.password)
      queryClient.clear()
      login(res.access_token, res.user)
      router.push('/mail/inbox')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign-in failed')
    }
  }

  return (
    <div className="w-full max-w-sm bg-white shadow-outlook rounded p-8">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect width="24" height="24" rx="4" fill="#0078D4" />
          <path d="M4 8h10v8H4z" fill="white" opacity="0.9" />
          <path d="M13 6l7 3v6l-7 3V6z" fill="white" opacity="0.7" />
        </svg>
        <span className="text-xl font-semibold text-[#323130]">Outlook</span>
      </div>

      <h1 className="text-2xl font-light text-[#323130] mb-1">Sign in</h1>
      <p className="text-sm text-[#605E5C] mb-6">to continue to Outlook</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Sign in form">
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#323130] mb-1"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-label="Email address"
            aria-describedby={errors.email ? 'email-error' : undefined}
            className="w-full border border-[#EDEBE9] rounded px-3 py-2 text-sm text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] transition-colors"
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1 text-xs text-[#D13438]">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#323130] mb-1"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-label="Password"
            aria-describedby={errors.password ? 'password-error' : undefined}
            className="w-full border border-[#EDEBE9] rounded px-3 py-2 text-sm text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] transition-colors"
            {...register('password')}
          />
          {errors.password && (
            <p id="password-error" role="alert" className="mt-1 text-xs text-[#D13438]">
              {errors.password.message}
            </p>
          )}
        </div>

        {serverError && (
          <div role="alert" className="mb-4 p-3 bg-[#FDE7E9] text-[#D13438] text-sm rounded">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          aria-label="Sign in"
          className="w-full bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] disabled:opacity-50 text-white text-sm font-medium py-2 px-4 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:ring-offset-2"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
