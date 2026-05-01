import type { Metadata } from 'next'
import '@/styles/globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Outlook',
  description: 'Microsoft Outlook Clone',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden bg-white text-outlook-text-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
