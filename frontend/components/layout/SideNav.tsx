'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChartNoAxesCombined,
  FlaskConical,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard' },
  { icon: Sparkles, label: 'Build Plan', href: '/arbitrage' },
  { icon: FlaskConical, label: 'Stress Test', href: '/sandbox' },
  { icon: ChartNoAxesCombined, label: 'Insights', href: '/analytics' },
]

export default function SideNav({ active }: { active?: string }) {
  const path = usePathname()

  return (
    <aside className="sidenav-shell">
      <div className="sidenav-heading">
        <span className="text-label">Study Tools</span>
        <span className="text-mono">Core screens only</span>
      </div>

      <nav className="sidenav-group" aria-label="Workspace">
        {navItems.map((item) => {
          const isActive = item.href === path || active === item.label
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`sidenav-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
