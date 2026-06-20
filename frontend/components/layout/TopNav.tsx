'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CalendarSync, Link2, LoaderCircle } from 'lucide-react'
import { api, ApiError } from '@/lib/api/client'
import { useStore } from '@/lib/store/TaskStore'
import Logo from '@/components/ui/Logo'
import type { MeResponse } from '@/lib/api/types'

const links = [
  { href: '/', label: 'Add Tasks' },
  { href: '/dashboard', label: 'Overview' },
  { href: '/arbitrage', label: 'Plan' },
  { href: '/sandbox', label: 'Stress Test' },
  { href: '/analytics', label: 'Insights' },
]

export default function TopNav() {
  const path = usePathname()
  const { userId, setUserId } = useStore()
  const [authBusy, setAuthBusy] = useState(false)
  const [authErr, setAuthErr] = useState<string | null>(null)
  const [me, setMe] = useState<MeResponse | null>(null)

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

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    api.me(userId)
      .then((res) => {
        if (!cancelled) setMe(res)
      })
      .catch(() => {
        if (!cancelled) setMe(null)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const activeMe = userId ? me : null

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
    <header className="topnav-shell">
      <div className="topnav-brand">
        <Link href="/" className="topnav-logo">
          <Logo size={28} fontSize={20} />
        </Link>
        <div className="topnav-status">
          <span className="glow-dot pulse" />
          <span className="text-mono">Plan schoolwork with your real calendar</span>
        </div>
      </div>

      <nav className="topnav-links" aria-label="Primary">
        {links.map((l) => {
          const active = path === l.href
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`topnav-link${active ? ' is-active' : ''}`}
            >
              {l.label}
            </Link>
          )
        })}
      </nav>

      <div className="topnav-actions">
        {userId ? (
          <button
            onClick={disconnect}
            title={`${activeMe?.email ?? `Connected user ${userId}`} — click to disconnect`}
            className="topnav-connection is-live"
          >
            <Link2 size={14} />
            <span>{activeMe?.name ? `${activeMe.name} Linked` : 'Calendar Linked'}</span>
          </button>
        ) : (
          <button
            onClick={connect}
            disabled={authBusy}
            title={authErr ?? 'Connect Google Calendar'}
            className={`topnav-connection${authErr ? ' is-error' : ''}`}
          >
            {authBusy ? <LoaderCircle size={14} className="spin" /> : <CalendarSync size={14} />}
            <span>{authBusy ? 'Connecting...' : authErr ? 'Auth Offline' : 'Connect Calendar'}</span>
          </button>
        )}
      </div>
    </header>
  )
}
