/**
 * Next.js navigation compat shim — back-ports the hook signatures we used
 * during the legacy Next.js era to react-router-dom equivalents, so the
 * Vite-side components can keep their existing import sites:
 *
 *   import { useRouter, usePathname, useSearchParams } from '@/lib/next-compat'
 *
 * Phase 3 migrates everything at once via sed; the shim avoids touching
 * hundreds of call sites for `router.push('/foo')`, `pathname.startsWith(...)`,
 * and `searchParams.get('q')`.
 */
import {
  useLocation,
  useNavigate,
  useParams as useParamsRR,
  useSearchParams as useSearchParamsRR,
} from 'react-router-dom'

export type AppRouter = {
  push: (path: string) => void
  replace: (path: string) => void
  back: () => void
  forward: () => void
  refresh: () => void
  prefetch: (_: string) => void
}

export function useRouter(): AppRouter {
  const navigate = useNavigate()
  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => window.location.reload(),
    prefetch: () => {
      /* no-op — Vite handles code-splitting via dynamic imports */
    },
  }
}

export function usePathname(): string {
  return useLocation().pathname
}

/**
 * Next's `useSearchParams()` returns the URLSearchParams object directly
 * (with `.get(name)`). react-router-dom returns a tuple
 * `[URLSearchParams, setter]`. This shim returns the read view to match
 * legacy call sites; mutating callers should use react-router's
 * `useSearchParams` directly.
 */
export function useSearchParams(): URLSearchParams {
  const [params] = useSearchParamsRR()
  return params
}

/**
 * Next's `useParams()` returns Record<string, string | string[]>. RR's
 * returns Record<string, string | undefined>. Same access pattern.
 */
export const useParams = useParamsRR
