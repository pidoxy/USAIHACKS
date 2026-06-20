import type { ReactNode } from 'react'
import TopNav from '@/components/layout/TopNav'
import SideNav from '@/components/layout/SideNav'

export default function AppShell({
  children,
  active,
}: {
  children: ReactNode
  active?: string
}) {
  return (
    <div className="app-shell">
      <TopNav />
      <SideNav active={active} />
      <main className="app-main">{children}</main>
    </div>
  )
}
