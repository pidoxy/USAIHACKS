import type { Metadata } from 'next'
import './globals.css'
import { TaskStoreProvider } from '@/lib/store/TaskStore'

export const metadata: Metadata = {
  title: 'KRONOS — Chrono-Kinetic Simulation Engine',
  description: 'Stress-test your life with adversarial simulations before you risk your real-world GPA or career.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="scanlines" />
        <TaskStoreProvider>{children}</TaskStoreProvider>
      </body>
    </html>
  )
}
