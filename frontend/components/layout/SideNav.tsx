'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChartNoAxesCombined,
  FlaskConical,
  LayoutDashboard,
  PencilLine,
  Sparkles,
} from 'lucide-react'
import Logo from '@/components/ui/Logo'

const navItems = [
  { icon: PencilLine, label: 'Capture', href: '/' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Sparkles, label: 'Plan', href: '/arbitrage' },
  { icon: FlaskConical, label: 'Stress Test', href: '/sandbox' },
  { icon: ChartNoAxesCombined, label: 'Insights', href: '/analytics' },
]

export default function SideNav({ active }: { active?: string }) {
  void active
  const path = usePathname()

  return (
    <>
      <aside className="sidenav-shell">
        <Link href="/" className="sidenav-brand">
          <Logo size={30} fontSize={18} />
          <div className="sidenav-brand-copy">
            <span className="text-label">Second brain</span>
            <span className="text-mono">Your study playground</span>
          </div>
        </Link>

        <Link href="/" className="sidenav-cta">
          Quick Capture
        </Link>

        <nav className="sidenav-group" aria-label="Workspace">
          {navItems.map((item) => {
            const isActive = item.href === path
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`sidenav-link${isActive ? ' is-active' : ''}`}
              >
                <span className="sidenav-icon-wrap">
                  <Icon size={18} />
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="sidenav-footer-note">
          <span className="text-label">How to use it</span>
          <p className="text-mono">Capture tasks, build a plan, then pressure-test the week.</p>
        </div>
      </aside>

      <nav className="mobile-dock" aria-label="Mobile">
        {navItems.map((item) => {
          const isActive = item.href === path
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`mobile-dock-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
