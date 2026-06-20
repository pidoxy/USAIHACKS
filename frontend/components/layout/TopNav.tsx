'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api/client'
import { useStore } from '@/lib/store/TaskStore'

const links = [
  { href: '/',          label: 'Ingestion' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/arbitrage', label: 'Arbitrage'  },
  { href: '/sandbox',   label: 'Simulation' },
  { href: '/analytics', label: 'Analytics'  },
]

export default function TopNav() {
  const path = usePathname()
  const { userId, setUserId } = useStore()
  const [authBusy, setAuthBusy] = useState(false)
  const [authErr, setAuthErr] = useState<string | null>(null)

  // Capture ?user_id= handed back by the OAuth callback, then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const uid = params.get('user_id')
    if (uid && Number(uid)) {
      setUserId(Number(uid))
      params.delete('user_id')
      const qs = params.toString()
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
    }
  }, [setUserId])

  const connect = async () => {
    if (authBusy) return
    setAuthErr(null)
    setAuthBusy(true)
    try {
      const { auth_url } = await api.googleAuthUrl()
      window.location.href = auth_url
    } catch (e) {
      setAuthErr(e instanceof ApiError ? e.message : 'Auth unavailable')
      setAuthBusy(false)
    }
  }

  const disconnect = () => setUserId(null)

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
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  padding: '6px 10px',
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
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {userId ? (
          <button
            onClick={disconnect}
            title={`Connected (user ${userId}) — click to disconnect`}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(78,222,163,0.10)', border: '1px solid rgba(78,222,163,0.3)',
              color: 'var(--color-primary)', cursor: 'pointer', padding: '6px 12px', borderRadius: 8,
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-primary)', boxShadow: '0 0 6px var(--color-primary)' }} className="pulse" />
            CALENDAR LINKED
          </button>
        ) : (
          <button
            onClick={connect}
            disabled={authBusy}
            title={authErr ?? 'Connect Google Calendar'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px solid rgba(255,255,255,0.12)',
              color: authErr ? 'var(--color-error)' : 'var(--color-on-muted)',
              cursor: 'pointer', padding: '6px 12px', borderRadius: 8,
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              transition: 'color 0.2s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {authBusy ? 'sync' : 'calendar_add_on'}
            </span>
            {authBusy ? 'CONNECTING…' : authErr ? 'AUTH OFFLINE' : 'CONNECT CALENDAR'}
          </button>
        )}
        <button style={{ background: 'none', border: 'none', color: 'var(--color-on-muted)', cursor: 'pointer', padding: 8, borderRadius: 8, transition: 'color 0.2s' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
        </button>
      </div>
    </header>
  )
}
