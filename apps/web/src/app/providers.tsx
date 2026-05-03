'use client'

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { settings } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

function ThemeSync() {
  const token = useAuthStore((s) => s.token)

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settings.get(),
    staleTime: 60000,
    enabled: !!token,
  })

  const theme = data?.general?.theme ?? data?.theme ?? 'light'

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      {children}
    </QueryClientProvider>
  )
}
