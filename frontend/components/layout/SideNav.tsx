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
  const currentLabel =
    navItems.find((item) => item.href === path || active === item.label)?.label ?? 'Overview'

  return (
    <aside className="sidenav-shell">
      <div className="sidenav-heading">
        <span className="text-label">Navigator</span>
        <span className="text-mono">You are in {currentLabel}</span>
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

      <div className="sidenav-footer-note">
        <span className="text-label">Flow</span>
        <p className="text-mono">Add tasks, build a plan, then test your week.</p>
      </div>
    </aside>
  )
}
