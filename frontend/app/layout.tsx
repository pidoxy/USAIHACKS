/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from 'next'
import './globals.css'
import { TaskStoreProvider } from '@/lib/store/TaskStore'

export const metadata: Metadata = {
  title: 'Kronos',
  description: 'Turn your tasks into a study plan that fits your real week.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Quicksand:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <TaskStoreProvider>{children}</TaskStoreProvider>
      </body>
    </html>
  )
}
