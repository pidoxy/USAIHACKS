'use client'
import { useMemo, useState } from 'react'
import TopNav from '@/components/layout/TopNav'
import SideNav from '@/components/layout/SideNav'
import Link from 'next/link'
import { useStore, weightToStress } from '@/lib/store/TaskStore'

const stressMeta = {
  high:   { label: 'URGENT', color: 'var(--color-error)' },
  medium: { label: 'HIGH',   color: 'var(--color-tertiary)' },
  low:    { label: 'NORMAL', color: 'var(--color-primary)' },
} as const

// 08:00 → 24:00 window maps to 0% → 100%
const HOUR_START = 8
const HOUR_SPAN = 16
const topPct = (h: number) => ((h - HOUR_START) / HOUR_SPAN) * 100
const heightPct = (s: number, e: number) => ((e - s) / HOUR_SPAN) * 100

const heatToColor = (heat: string): string => {
  const h = (heat || '').toLowerCase()
  if (h.includes('red')) return 'var(--color-error)'
  if (h.includes('amber') || h.includes('orange') || h.includes('yellow')) return '#fbbf24'
  return 'var(--color-primary)'
}

export default function Dashboard() {
  const { tasks, lastArbitrage, hydrated } = useStore()

  // Sort priority queue by due date, then by cognitive weight desc.
  const queue = useMemo(
    () =>
      [...tasks].sort((a, b) =>
        a.due_date === b.due_date
          ? b.cognitive_weight - a.cognitive_weight
          : a.due_date.localeCompare(b.due_date),
      ),
    [tasks],
  )

  // Remaining cognitive load, split by stress band.
  const load = useMemo(() => {
    let low = 0, med = 0, high = 0
    for (const t of tasks) {
      const rem = Math.max(0, t.workload_hours - (t.completed_hours ?? 0))
      const s = weightToStress(t.cognitive_weight)
      if (s === 'high') high += rem
      else if (s === 'medium') med += rem
      else low += rem
    }
    const total = low + med + high || 1
    return { low, med, high, total }
  }, [tasks])

  // Shadow calendar: blocks from the last arbitrage run, grouped by day.
  const scheduleDays = useMemo(() => {
    if (!lastArbitrage) return []
    return [...new Set(lastArbitrage.scheduled.map(b => b.date))].sort()
  }, [lastArbitrage])
  const [dayIdx, setDayIdx] = useState(0)
  const activeDay = scheduleDays[Math.min(dayIdx, scheduleDays.length - 1)]
  const dayBlocks = lastArbitrage?.scheduled.filter(b => b.date === activeDay) ?? []

  return (
    <div style={{ minHeight: '100vh' }}>
      <TopNav />
      <SideNav active="Focus Mode" />

      <main style={{ paddingTop: 160, paddingLeft: 120, paddingRight: 48, paddingBottom: 48 }}>
        <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 220px)' }}>

          {/* Left: Deficit Debt + Priority Queue */}
          <div style={{ width: '38%', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Deficit Debt */}
            <div className="glass" style={{ borderRadius: 16, padding: 24, position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: -40, right: -40,
                width: 120, height: 120, borderRadius: '50%',
                background: 'rgba(255,119,138,0.08)', filter: 'blur(32px)',
              }} />
              <h2 className="text-headline-sm" style={{ color: 'var(--color-on-surface)', marginBottom: 4 }}>Deficit Debt</h2>
              <p className="text-label" style={{ color: 'var(--color-on-muted)', marginBottom: 20 }}>UNRESOLVED COGNITIVE LOAD</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 20 }}>
                <span className="text-display" style={{ color: load.high > load.low ? 'var(--color-error)' : 'var(--color-primary)', fontSize: 52 }}>
                  {(load.low + load.med + load.high).toFixed(1)}h
                </span>
                <span className="text-mono" style={{ color: 'var(--color-on-muted)', paddingBottom: 6 }}>across {tasks.length} tasks</span>
              </div>
              {/* Load bar */}
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(load.low / load.total) * 100}%`, height: '100%', background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)' }} />
                <div style={{ width: `${(load.med / load.total) * 100}%`, height: '100%', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }} />
                <div style={{ width: `${(load.high / load.total) * 100}%`, height: '100%', background: 'var(--color-error)', boxShadow: '0 0 8px var(--color-error)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                {[`Light ${load.low.toFixed(1)}h`, `Moderate ${load.med.toFixed(1)}h`, `Heavy ${load.high.toFixed(1)}h`].map(l => (
                  <span key={l} className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 11 }}>{l}</span>
                ))}
              </div>
            </div>

            {/* Priority Queue */}
            <div className="glass" style={{ borderRadius: 16, padding: 24, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="text-headline-sm" style={{ color: 'var(--color-on-surface)' }}>Priority Queue</h3>
                <Link href="/" style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1 }}>
                {queue.map(task => {
                  const meta = stressMeta[weightToStress(task.cognitive_weight)]
                  return (
                    <div
                      key={task.id}
                      style={{
                        padding: '14px 16px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                        <span className="chip" style={{ color: meta.color, background: `${meta.color}18`, width: 'fit-content' }}>{meta.label}</span>
                        <span className="text-body" style={{ color: 'var(--color-on-surface)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                        <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>
                          {task.workload_hours}h · due {task.due_date.slice(5)} · {task.category}
                        </span>
                      </div>
                      <Link
                        href="/sandbox"
                        style={{
                          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                          background: 'var(--color-surface-mid)', border: '1px solid rgba(255,255,255,0.08)',
                          color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>
                      </Link>
                    </div>
                  )
                })}
                {hydrated && queue.length === 0 && (
                  <p className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>
                    Queue empty — <Link href="/" style={{ color: 'var(--color-primary)' }}>ingest tasks</Link> to begin.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Shadow Calendar */}
          <div className="glass" style={{ flex: 1, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              position: 'absolute', top: -80, left: -80,
              width: 200, height: 200, borderRadius: '50%',
              background: 'rgba(78,222,163,0.04)', filter: 'blur(48px)', pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, position: 'relative', zIndex: 1 }}>
              <div>
                <h2 className="text-headline-sm" style={{ color: 'var(--color-on-surface)' }}>Shadow Calendar</h2>
                {activeDay && <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>{activeDay}</span>}
              </div>
              {scheduleDays.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => setDayIdx(i => Math.max(0, i - 1))} className="btn-ghost" style={{ padding: '6px 10px' }}>‹</button>
                  <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 11 }}>Day {Math.min(dayIdx, scheduleDays.length - 1) + 1}/{scheduleDays.length}</span>
                  <button onClick={() => setDayIdx(i => Math.min(scheduleDays.length - 1, i + 1))} className="btn-ghost" style={{ padding: '6px 10px' }}>›</button>
                </div>
              ) : (
                <Link href="/arbitrage" style={{ textDecoration: 'none' }}>
                  <button className="btn-ghost" style={{ padding: '6px 16px', fontSize: 11 }}>RUN ARBITRAGE</button>
                </Link>
              )}
            </div>

            <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid rgba(255,255,255,0.08)', marginLeft: 64 }}>
              {/* Time markers */}
              {[['08:00', '0%'], ['12:00', '25%'], ['16:00', '50%'], ['20:00', '75%']].map(([t, top]) => (
                <div key={t} style={{ position: 'absolute', left: -64, top, width: 48, textAlign: 'right' }}>
                  <span className="text-mono" style={{ color: 'rgba(187,202,191,0.4)', fontSize: 11 }}>{t}</span>
                </div>
              ))}
              {['25%', '50%', '75%'].map(top => (
                <div key={top} style={{ position: 'absolute', top, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.04)' }} />
              ))}

              {/* Real scheduled blocks */}
              {dayBlocks.map((block, i) => {
                const c = heatToColor(block.heat_color)
                return (
                  <div
                    key={i}
                    className="timeline-block"
                    style={{
                      top: `${topPct(block.start_hour)}%`,
                      height: `${Math.max(5, heightPct(block.start_hour, block.end_hour))}%`,
                      background: `${c}18`,
                      border: `1px solid ${c}35`,
                    }}
                    title={`${block.title} — ${block.start_hour}:00–${block.end_hour}:00 (${block.load_pct}% load)`}
                  >
                    <span className="text-body" style={{ color: c, fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{block.title}</span>
                    <span className="text-mono" style={{ color: `${c}90`, fontSize: 11 }}>{block.start_hour}:00–{block.end_hour}:00 · {block.load_pct}%</span>
                  </div>
                )
              })}

              {scheduleDays.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 13, textAlign: 'center', maxWidth: 280 }}>
                    No shadow schedule yet. Run <Link href="/arbitrage" style={{ color: 'var(--color-primary)' }}>Tactical Arbitrage</Link> to project deep-work blocks here.
                  </span>
                </div>
              )}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                { label: 'Light Load',  color: 'var(--color-primary)' },
                { label: 'Moderate',    color: '#fbbf24' },
                { label: 'Heavy Load',  color: 'var(--color-error)' },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: color, opacity: 0.7 }} />
                  <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 11 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <Link href="/arbitrage" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '12px 32px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bolt</span>
                RUN ARBITRAGE PROTOCOL
              </span>
            </button>
          </Link>
          <Link href="/sandbox" style={{ textDecoration: 'none' }}>
            <button className="btn-ghost" style={{ padding: '12px 32px' }}>STRESS TEST SANDBOX</button>
          </Link>
          <Link href="/analytics" style={{ textDecoration: 'none' }}>
            <button className="btn-ghost" style={{ padding: '12px 32px' }}>VIEW ANALYTICS</button>
          </Link>
        </div>
      </main>
    </div>
  )
}
