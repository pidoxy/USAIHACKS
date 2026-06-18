'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { icon: 'monitor_heart',   label: 'System Health', href: '/dashboard'  },
  { icon: 'center_focus_strong', label: 'Focus Mode', href: '/dashboard' },
  { icon: 'query_stats',     label: 'Analytics',    href: '/analytics'  },
]
const bottomItems = [
  { icon: 'help',     label: 'Support', href: '#' },
  { icon: 'terminal', label: 'Logs',    href: '#' },
]

export default function SideNav({ active }: { active?: string }) {
  const path = usePathname()
  return (
    <nav
      className="sidenav"
      style={{
        position: 'fixed', left: 0, top: 120, bottom: 20,
        width: 76, zIndex: 40,
        display: 'flex', flexDirection: 'column', padding: '24px 0',
        background: 'rgba(20,27,44,0.25)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '0 16px 16px 0',
        boxShadow: '2px 0 24px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}
      onMouseEnter={e => (e.currentTarget.style.width = '220px')}
      onMouseLeave={e => (e.currentTarget.style.width = '76px')}
    >
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 12 }}>
        <div className="text-label" style={{ color: 'var(--color-secondary)', fontSize: 9 }}>KRONOS SYS</div>
        <div className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 10, opacity: 0.5 }}>V-2.4 ACTIVE</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px' }}>
        {navItems.map(item => {
          const isActive = item.href === path || active === item.label
          return (
            <Link
              key={item.label}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '10px 12px', borderRadius: 10,
                textDecoration: 'none',
                color: isActive ? 'var(--color-primary)' : 'var(--color-on-muted)',
                background: isActive ? 'rgba(78,222,163,0.10)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22, flexShrink: 0, fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span className="sidenav-label text-label" style={{ fontSize: 10 }}>{item.label}</span>
            </Link>
          )
        })}
      </div>

      <div style={{ padding: '12px 8px 0', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {bottomItems.map(item => (
          <Link
            key={item.label}
            href={item.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '10px 12px', borderRadius: 10,
              textDecoration: 'none',
              color: 'var(--color-on-muted)',
              transition: 'all 0.2s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
            <span className="sidenav-label text-label" style={{ fontSize: 10 }}>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
