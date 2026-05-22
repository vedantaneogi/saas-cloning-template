import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useRouter } from '@/lib/next-compat'
import { auth } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useState } from 'react'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  display_name: z.string().min(1, 'Display name required'),
  password: z.string().min(8, 'Min 8 characters'),
})

type FormValues = z.infer<typeof schema>

export function SignUp() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setServerError(null)
    try {
      const res = await auth.signup(data.email, data.password, data.display_name)
      login(res.access_token, res.user)
      router.push('/mail/inbox')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign-up failed')
    }
  }

  return (
    <div data-testid="signup-page" className="min-h-screen flex items-center justify-center bg-[#FAF9F8] p-4">
      <div className="w-full max-w-sm bg-white shadow-outlook rounded p-8">
        <h1 className="text-2xl font-light text-[#323130] mb-1">Create account</h1>
        <p className="text-sm text-[#605E5C] mb-6">Outlook clone</p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {(['email', 'display_name', 'password'] as const).map((name) => (
            <div key={name} className="mb-4">
              <label className="block text-sm font-medium text-[#323130] mb-1" htmlFor={name}>
                {name === 'display_name' ? 'Display name' : name === 'email' ? 'Email' : 'Password'}
              </label>
              <input
                id={name}
                data-testid={`signup-${name}`}
                type={name === 'password' ? 'password' : 'text'}
                className="w-full border border-[#EDEBE9] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
                {...register(name)}
              />
              {errors[name] && (
                <p role="alert" className="mt-1 text-xs text-[#D13438]">{errors[name]?.message}</p>
              )}
            </div>
          ))}
          {serverError && (
            <div role="alert" className="mb-4 p-3 bg-[#FDE7E9] text-[#D13438] text-sm rounded">
              {serverError}
            </div>
          )}
          <button
            type="submit"
            data-testid="signup-submit"
            disabled={isSubmitting}
            className="w-full bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-50 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-sm text-[#605E5C] text-center">
          Already have one? <Link to="/sign-in" className="text-[#0078D4] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
