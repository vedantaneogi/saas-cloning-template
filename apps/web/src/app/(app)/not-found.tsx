import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <h2 className="text-xl font-semibold text-[#323130]">Page not found</h2>
      <p className="text-sm text-[#605E5C]">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/mail/inbox">
        <Button>Go to Inbox</Button>
      </Link>
    </div>
  )
}
