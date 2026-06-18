'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',          label: 'Ingestion' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/arbitrage', label: 'Arbitrage'  },
  { href: '/sandbox',   label: 'Simulation' },
  { href: '/analytics', label: 'Analytics'  },
]

export default function TopNav() {
  const path = usePathname()
  return (
    <header
      style={{
        position: 'fixed', top: 40, left: 40, right: 40, zIndex: 50,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 24px',
        background: 'rgba(24,31,49,0.35)',
        backdropFilter: 'blur(24px)',
        borderTop:   '1px solid rgba(255,255,255,0.10)',
        borderLeft:  '1px solid rgba(255,255,255,0.06)',
        borderRight: '1px solid rgba(0,0,0,0.20)',
        borderBottom:'1px solid rgba(0,0,0,0.25)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(78,222,163,0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span className="text-display" style={{ fontSize: 22, letterSpacing: '0.25em', color: 'var(--color-primary)' }}>
            KRONOS
          </span>
        </Link>
        <nav style={{ display: 'flex', gap: 4 }}>
          {links.map(l => {
            const active = path === l.href
            return (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  padding: '6px 14px',
                  borderRadius: 8,
                  color: active ? 'var(--color-primary)' : 'var(--color-on-muted)',
                  background: active ? 'rgba(78,222,163,0.10)' : 'transparent',
                  borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ background: 'none', border: 'none', color: 'var(--color-on-muted)', cursor: 'pointer', padding: 8, borderRadius: 8, transition: 'color 0.2s' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
        </button>
        <button style={{ background: 'none', border: 'none', color: 'var(--color-on-muted)', cursor: 'pointer', padding: 8, borderRadius: 8, transition: 'color 0.2s' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>account_circle</span>
        </button>
      </div>
    </header>
  )
}
