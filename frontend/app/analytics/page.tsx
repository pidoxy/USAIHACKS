'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import { api } from '@/lib/api/client'
import { useStore } from '@/lib/store/TaskStore'
import type { VelocityProfile, MeResponse } from '@/lib/api/types'

function chronotypeOf(me: MeResponse | null) {
  const t = String(me?.circadian_type ?? '').toLowerCase()
  if (t.includes('owl') || t.includes('night') || t.includes('evening'))
    return { type: 'NIGHT OWL', peak: '1600 – 2200', secondary: '2200 – 0100', icon: 'dark_mode', color: 'var(--color-secondary)', sleep: '01:30' }
  if (t.includes('intermediate') || t.includes('third'))
    return { type: 'INTERMEDIATE', peak: '1000 – 1400', secondary: '1700 – 1900', icon: 'wb_twilight', color: 'var(--color-primary)', sleep: '23:30' }
  return { type: 'MORNING LARK', peak: '0600 – 1100', secondary: '1600 – 1800', icon: 'wb_sunny', color: '#fbbf24', sleep: '22:30' }
}

export default function Analytics() {
  const { userId } = useStore()
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const [profile, setProfile] = useState<VelocityProfile | null>(null)
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setLoading(true)
      Promise.allSettled([api.velocityProfile(userId), api.me(userId)]).then(([p, m]) => {
        if (cancelled) return
        if (p.status === 'fulfilled') setProfile(p.value)
        if (m.status === 'fulfilled') setMe(m.value)
        setLoading(false)
      })
    })
    return () => { cancelled = true }
  }, [userId])

  const activeProfile = userId ? profile : null
  const activeMe = userId ? me : null
  const isLive = !!activeProfile
  const eta0 = activeProfile?.eta_0 && activeProfile.eta_0 > 0 ? Math.min(1, activeProfile.eta_0) : 1.0

  // η(t) decay curve seeded by the user's personalised base efficiency.
  const etaCurve = useMemo(
    () => Array.from({ length: 14 }, (_, i) => Math.max(0.1, Math.round(eta0 * Math.exp(-0.07 * i) * 100) / 100)),
    [eta0],
  )

  const ratios = useMemo(() => {
    const r = activeProfile?.category_ratios && Object.keys(activeProfile.category_ratios).length
      ? activeProfile.category_ratios
      : null
    return r ? Object.entries(r).map(([task, multiplier]) => ({ task, multiplier })) : []
  }, [activeProfile])

  const avgMultiplier = ratios.length
    ? ratios.reduce((s, v) => s + v.multiplier, 0) / ratios.length
    : 1
  const chrono = chronotypeOf(activeMe)
  const etaColor = (v: number) => (v >= 0.7 ? 'var(--color-primary)' : v >= 0.4 ? '#fbbf24' : 'var(--color-error)')

  return (
    <AppShell active="Analytics">
      <div className="page-stack">
        <section className="page-hero">
          <span className="hero-kicker">Insights</span>
          <div className="hero-title-row">
            <div className="hero-copy">
              <h1 className="text-headline" style={{ color: 'var(--color-on-surface)', marginBottom: 6 }}>Study Insights</h1>
              <p className="text-body">
                Learn when you work best, how fast tasks really take you, and how your study habits change over time.
              </p>
            </div>
            <div className="hero-meta">
              {[
                { label: 'η₀', value: eta0.toFixed(2), color: 'var(--color-primary)' },
                { label: 'VEL', value: `×${avgMultiplier.toFixed(2)}`, color: 'var(--color-secondary)' },
              ].map(({ label, value, color }) => (
                <span key={label} className="meta-pill" style={{ color }}>
                  {label}: {value}
                </span>
              ))}
            </div>
          </div>
          <div className="hero-meta">
            <span className="meta-pill">{loading ? 'Loading profile' : isLive ? `${activeProfile?.total_records ?? 0} study records` : 'No study data yet'}</span>
            <span className="meta-pill">{chrono.type}</span>
          </div>
        </section>

        {!isLive && !loading && (
          <div className="status-banner is-info">
            <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: 20 }}>info</span>
            <span className="text-mono" style={{ color: 'var(--color-secondary)', fontSize: 12 }}>
              No study history yet. Connect your calendar and use the app a bit more to unlock personal timing and pacing insights.
            </span>
          </div>
        )}

        <div className="grid-12">
          {/* η(t) Efficiency Decay Chart */}
          <div className="glass" style={{ gridColumn: 'span 8', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 className="text-label" style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>show_chart</span>
                  COGNITIVE EFFICIENCY DECAY
                </h3>
                <p className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12, marginTop: 4 }}>η(t) = η₀·e^(−λt) over a 14-day window</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(78,222,163,0.08)', padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(78,222,163,0.2)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? 'var(--color-primary)' : 'var(--color-on-muted)' }} className={isLive ? 'pulse' : ''} />
                <span className="text-label" style={{ color: isLive ? 'var(--color-primary)' : 'var(--color-on-muted)', fontSize: 9 }}>{isLive ? 'LIVE' : 'EMPTY'}</span>
              </div>
            </div>

            <div style={{ height: 220, position: 'relative' }}>
              {[1.0, 0.75, 0.5, 0.25].map(v => (
                <div key={v} style={{ position: 'absolute', left: 0, top: `${(1 - v) * 100}%`, transform: 'translateY(-50%)' }}>
                  <span className="text-mono" style={{ color: 'rgba(187,202,191,0.4)', fontSize: 10 }}>η={v.toFixed(2)}</span>
                </div>
              ))}
              {[0.25, 0.5, 0.75].map(v => (
                <div key={v} style={{ position: 'absolute', left: 40, right: 0, top: `${(1 - v) * 100}%`, height: 1, background: 'rgba(255,255,255,0.04)' }} />
              ))}

              <svg style={{ position: 'absolute', left: 40, top: 0, right: 0, height: '100%', width: 'calc(100% - 40px)' }} viewBox="0 0 560 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="etaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4edea3" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#4edea3" stopOpacity="0" />
                  </linearGradient>
                  <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
                <path d={`M ${etaCurve.map((v, i) => `${i * (560 / (etaCurve.length - 1))},${200 - v * 200}`).join(' L ')} L ${560},200 L 0,200 Z`} fill="url(#etaGrad)" />
                <polyline points={etaCurve.map((v, i) => `${i * (560 / (etaCurve.length - 1))},${200 - v * 200}`).join(' ')} fill="none" stroke="#4edea3" strokeWidth="2.5" filter="url(#glow)" />
                {etaCurve.map((v, i) => (
                  <circle key={i} cx={i * (560 / (etaCurve.length - 1))} cy={200 - v * 200} r={hoveredDay === i ? 5 : 3} fill={etaColor(v)} style={{ cursor: 'pointer' }} onMouseEnter={() => setHoveredDay(i)} onMouseLeave={() => setHoveredDay(null)} />
                ))}
                {hoveredDay !== null && (
                  <g>
                    <rect x={Math.min(hoveredDay * (560 / (etaCurve.length - 1)) - 30, 500)} y={200 - etaCurve[hoveredDay] * 200 - 36} width={72} height={24} rx={4} fill="rgba(24,31,49,0.9)" stroke="rgba(78,222,163,0.3)" strokeWidth="1" />
                    <text x={Math.min(hoveredDay * (560 / (etaCurve.length - 1)), 516)} y={200 - etaCurve[hoveredDay] * 200 - 18} fill="#4edea3" fontSize="11" fontFamily="JetBrains Mono" textAnchor="middle">η={etaCurve[hoveredDay].toFixed(2)}</text>
                  </g>
                )}
              </svg>

              <div style={{ position: 'absolute', bottom: -20, left: 40, right: 0, display: 'flex', justifyContent: 'space-between' }}>
                {['T-14', 'T-12', 'T-10', 'T-8', 'T-6', 'T-4', 'T-2', 'T-0'].map(d => (
                  <span key={d} className="text-mono" style={{ color: 'rgba(187,202,191,0.35)', fontSize: 10 }}>{d}</span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p className="text-label" style={{ color: 'var(--color-on-muted)', fontSize: 9 }}>DAILY EFFICIENCY LEVEL</p>
                <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 9 }}>T-14 → NOW</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 56 }}>
                {etaCurve.map((v, i) => (
                  <div key={i} title={`Day T-${14 - i}: η=${v.toFixed(2)}`} style={{ flex: 1, height: `${Math.round(v * 100)}%`, background: etaColor(v), opacity: 0.7, borderRadius: '2px 2px 0 0', minHeight: 4 }} />
                ))}
              </div>
            </div>
          </div>

          {/* Chronotype Card */}
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass" style={{ borderRadius: 16, padding: 24 }}>
              <h3 className="text-label" style={{ color: 'var(--color-on-muted)', marginBottom: 16 }}>CHRONOTYPE PROFILE</h3>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: chrono.color }}>{chrono.icon}</span>
                <p className="text-label" style={{ color: chrono.color, marginTop: 12, fontSize: 13 }}>{chrono.type}</p>
                <p className="text-mono" style={{ color: 'var(--color-on-muted)', marginTop: 8, fontSize: 12 }}>Peak: {chrono.peak}</p>
                <p className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>Secondary: {chrono.secondary}</p>
              </div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Optimal deep-work window', value: chrono.peak },
                  { label: 'Recommended sleep time', value: chrono.sleep },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 11 }}>{label}</span>
                    <span className="text-mono" style={{ color: 'var(--color-on-surface)', fontSize: 11 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-active" style={{ borderRadius: 16, padding: 24, textAlign: 'center' }}>
              <p className="text-label" style={{ color: 'var(--color-on-muted)', marginBottom: 12 }}>PERSONAL VELOCITY MULTIPLIER</p>
              <span className="text-display" style={{ color: 'var(--color-primary)', fontSize: 40 }}>×{avgMultiplier.toFixed(2)}</span>
              <p className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12, marginTop: 8 }}>
                Your tasks take {((avgMultiplier - 1) * 100).toFixed(0)}% longer than estimated
              </p>
            </div>
          </div>

          {/* Velocity Insights Table */}
          <div className="glass" style={{ gridColumn: 'span 12', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(78,222,163,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: 18 }}>speed</span>
              <span className="text-label" style={{ color: 'var(--color-on-muted)' }}>VELOCITY INSIGHTS — {isLive ? 'PER-CATEGORY NORMALIZATION' : 'NO RECORDED DATA YET'}</span>
            </div>
            <table className="kronos-table">
              <thead>
                <tr>
                  <th>Task Category</th>
                  <th style={{ width: 160 }}>Velocity Multiplier</th>
                  <th style={{ width: 140 }}>Est. Accuracy</th>
                  <th style={{ width: 260 }}>Calibration</th>
                </tr>
              </thead>
              <tbody>
                {ratios.map(v => {
                  const accuracy = Math.min(100, Math.round((1 / v.multiplier) * 100))
                  const color = v.multiplier > 1.5 ? 'var(--color-error)' : v.multiplier > 1.3 ? '#fbbf24' : 'var(--color-primary)'
                  return (
                    <tr key={v.task}>
                      <td style={{ color: 'var(--color-on-surface)' }}>{v.task}</td>
                      <td style={{ color }}>×{v.multiplier.toFixed(2)}</td>
                      <td style={{ color: 'var(--color-on-muted)' }}>{accuracy}%</td>
                      <td>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${accuracy}%`, background: color, borderRadius: 3, boxShadow: '0 0 6px currentColor' }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {ratios.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-on-muted)', padding: '28px 12px' }}>
                      No timing data yet. Your real study-speed insights will appear here after backend records are available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="action-row">
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button className="btn-ghost" style={{ padding: '12px 32px' }}>← BACK TO DASHBOARD</button>
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
