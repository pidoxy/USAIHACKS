'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { CalendarSync, Link2, LoaderCircle } from 'lucide-react'
import { useStore } from '@/lib/store/TaskStore'

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Quick Capture',
    subtitle: 'Add your tasks, notes, or syllabus and let Kronos sort them.',
  },
  '/dashboard': {
    title: "Today's Pulse",
    subtitle: 'See what matters most and what to do next.',
  },
  '/arbitrage': {
    title: 'Schedule Optimizer',
    subtitle: 'Build a study plan that fits around classes and real life.',
  },
  '/sandbox': {
    title: 'Stress Test',
    subtitle: 'Try rough-week scenarios before they happen for real.',
  },
  '/analytics': {
    title: 'Insights',
    subtitle: 'Learn when you focus best and how your week is changing.',
  },
}

export default function TopNav() {
  const path = usePathname()
  const {
    authBusy,
    authError,
    authNotice,
    userId,
    me,
    connectCalendar,
    disconnectCalendar,
  } = useStore()

  const content = useMemo(
    () => pageMeta[path] ?? pageMeta['/'],
    [path],
  )

  const statusText = authError
    ? authError
    : authNotice
      ? authNotice
      : userId
        ? 'Calendar linked'
        : 'Calendar not linked'

  return (
    <header className="topnav-shell">
      <div className="topnav-copy">
        <span className="topnav-kicker">Kronos workspace</span>
        <h1 className="topnav-title">{content.title}</h1>
        <p className="topnav-subtitle">{content.subtitle}</p>
      </div>

      <div className="topnav-actions">
        <div className="topnav-context">
          <span className="text-label">Live status</span>
          <span className="text-mono">{statusText}</span>
        </div>

        {userId ? (
          <button
            onClick={disconnectCalendar}
            title={`${me?.email ?? `Connected user ${userId}`} — click to disconnect`}
            className="topnav-connection is-live"
          >
            <Link2 size={16} />
            <span>{me?.name ? `${me.name} linked` : 'Calendar linked'}</span>
          </button>
        ) : (
          <button
            onClick={connectCalendar}
            disabled={authBusy}
            title={authError ?? 'Connect Google Calendar'}
            className={`topnav-connection${authError ? ' is-error' : ''}`}
          >
            {authBusy ? <LoaderCircle size={16} className="spin" /> : <CalendarSync size={16} />}
            <span>{authBusy ? 'Connecting...' : authError ? 'Try calendar again' : 'Connect calendar'}</span>
          </button>
        )}
      </div>
    </header>
  )
}
