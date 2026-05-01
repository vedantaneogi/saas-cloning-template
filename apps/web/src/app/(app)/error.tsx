'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <h2 className="text-xl font-semibold text-[#323130]">Something went wrong</h2>
      <p className="text-sm text-[#605E5C] text-center max-w-sm">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
