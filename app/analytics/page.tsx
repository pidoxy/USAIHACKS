'use client'
import { useState } from 'react'
import TopNav from '@/components/layout/TopNav'
import SideNav from '@/components/layout/SideNav'

const ETA_CURVE = [1.0, 0.97, 0.93, 0.88, 0.82, 0.75, 0.67, 0.58, 0.50, 0.42, 0.36, 0.31, 0.27, 0.24]

const VELOCITY_DATA = [
  { task: 'Algorithm Optimization', estimated: 4, actual: 6.5, multiplier: 1.63 },
  { task: 'Report Writing',          estimated: 2, actual: 3.2, multiplier: 1.60 },
  { task: 'Code Review',             estimated: 1, actual: 1.3, multiplier: 1.30 },
  { task: 'Data Analysis',           estimated: 3, actual: 4.8, multiplier: 1.60 },
  { task: 'System Design',           estimated: 5, actual: 7.2, multiplier: 1.44 },
]

const CHRONOTYPE = { type: 'MORNING LARK', peak: '0600 – 1100', secondary: '1600 – 1800', icon: 'wb_sunny', color: '#fbbf24' }

export default function Analytics() {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  const maxEta = Math.max(...ETA_CURVE)
  const avgMultiplier = VELOCITY_DATA.reduce((s, v) => s + v.multiplier, 0) / VELOCITY_DATA.length

  const etaColor = (v: number) =>
    v >= 0.7 ? 'var(--color-primary)' : v >= 0.4 ? '#fbbf24' : 'var(--color-error)'

  return (
    <div style={{ minHeight: '100vh' }}>
      <TopNav />
      <SideNav active="Analytics" />

      <main style={{ paddingTop: 160, paddingLeft: 120, paddingRight: 48, paddingBottom: 48 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 24 }}>
          <div>
            <h1 className="text-headline" style={{ color: 'var(--color-on-surface)', marginBottom: 6 }}>Behavioral Analytics</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', boxShadow: '0 0 6px var(--color-primary)' }} className="pulse" />
              <span className="text-mono" style={{ color: 'var(--color-on-muted)' }}>LEARNING ENGINE DATA STREAM [ACTIVE]</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'PR:',   value: '98.2%', color: 'var(--color-primary)'   },
              { label: 'SYNC:', value: '-14ms', color: 'var(--color-secondary)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: 'rgba(24,31,49,0.6)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span className="text-label" style={{ color: 'var(--color-on-muted)', fontSize: 9 }}>{label}</span>
                <span className="text-mono" style={{ color, fontSize: 13, borderLeft: `1px solid ${color}40`, paddingLeft: 10 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
          {/* η(t) Efficiency Decay Chart */}
          <div className="glass" style={{ gridColumn: 'span 8', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 className="text-label" style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>show_chart</span>
                  COGNITIVE EFFICIENCY DECAY
                </h3>
                <p className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12, marginTop: 4 }}>η(t) over 14-day window</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(78,222,163,0.08)', padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(78,222,163,0.2)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)' }} className="pulse" />
                <span className="text-label" style={{ color: 'var(--color-primary)', fontSize: 9 }}>LIVE</span>
              </div>
            </div>

            <div style={{ height: 220, position: 'relative' }}>
              {/* Y axis labels */}
              {[1.0, 0.75, 0.5, 0.25].map(v => (
                <div key={v} style={{
                  position: 'absolute', left: 0, top: `${(1 - v) * 100}%`,
                  transform: 'translateY(-50%)',
                }}>
                  <span className="text-mono" style={{ color: 'rgba(187,202,191,0.4)', fontSize: 10 }}>η={v.toFixed(2)}</span>
                </div>
              ))}

              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map(v => (
                <div key={v} style={{
                  position: 'absolute', left: 40, right: 0, top: `${(1 - v) * 100}%`, height: 1,
                  background: 'rgba(255,255,255,0.04)',
                }} />
              ))}

              {/* SVG line chart */}
              <svg
                style={{ position: 'absolute', left: 40, top: 0, right: 0, height: '100%', width: 'calc(100% - 40px)' }}
                viewBox="0 0 560 200"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="etaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#4edea3" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#4edea3" stopOpacity="0" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                {/* Area fill */}
                <path
                  d={`M ${ETA_CURVE.map((v, i) => `${i * (560 / (ETA_CURVE.length - 1))},${200 - v * 200}`).join(' L ')} L ${560},200 L 0,200 Z`}
                  fill="url(#etaGrad)"
                />
                {/* Line */}
                <polyline
                  points={ETA_CURVE.map((v, i) => `${i * (560 / (ETA_CURVE.length - 1))},${200 - v * 200}`).join(' ')}
                  fill="none"
                  stroke="#4edea3"
                  strokeWidth="2.5"
                  filter="url(#glow)"
                />
                {/* Dots */}
                {ETA_CURVE.map((v, i) => (
                  <circle
                    key={i}
                    cx={i * (560 / (ETA_CURVE.length - 1))}
                    cy={200 - v * 200}
                    r={hoveredDay === i ? 5 : 3}
                    fill={etaColor(v)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredDay(i)}
                    onMouseLeave={() => setHoveredDay(null)}
                  />
                ))}
                {/* Tooltip */}
                {hoveredDay !== null && (
                  <g>
                    <rect
                      x={Math.min(hoveredDay * (560 / (ETA_CURVE.length - 1)) - 30, 500)}
                      y={200 - ETA_CURVE[hoveredDay] * 200 - 36}
                      width={72} height={24} rx={4}
                      fill="rgba(24,31,49,0.9)" stroke="rgba(78,222,163,0.3)" strokeWidth="1"
                    />
                    <text
                      x={Math.min(hoveredDay * (560 / (ETA_CURVE.length - 1)), 516)}
                      y={200 - ETA_CURVE[hoveredDay] * 200 - 18}
                      fill="#4edea3" fontSize="11" fontFamily="JetBrains Mono" textAnchor="middle"
                    >
                      η={ETA_CURVE[hoveredDay].toFixed(2)}
                    </text>
                  </g>
                )}
              </svg>

              {/* X axis */}
              <div style={{ position: 'absolute', bottom: -20, left: 40, right: 0, display: 'flex', justifyContent: 'space-between' }}>
                {['T-14','T-12','T-10','T-8','T-6','T-4','T-2','T-0'].map(d => (
                  <span key={d} className="text-mono" style={{ color: 'rgba(187,202,191,0.35)', fontSize: 10 }}>{d}</span>
                ))}
              </div>

              {/* Biological Peak marker */}
              <div style={{ position: 'absolute', left: '25%', top: 0, bottom: 0, width: 1, background: 'rgba(251,191,36,0.3)', borderLeft: '1px dashed rgba(251,191,36,0.5)' }}>
                <span style={{ position: 'absolute', top: 4, left: 6, fontFamily: 'var(--font-mono)', fontSize: 9, color: '#fbbf24' }}>BIOLOGICAL PEAK</span>
              </div>
            </div>

            {/* Entropy Volatility mini bars */}
            <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-label" style={{ color: 'var(--color-on-muted)', marginBottom: 12, fontSize: 9 }}>ENTROPY VOLATILITY</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 48 }}>
                {ETA_CURVE.map((v, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <div style={{
                      height: `${(1 - v) * 100}%`,
                      background: etaColor(v),
                      opacity: 0.6,
                      borderRadius: '2px 2px 0 0',
                    }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chronotype Card */}
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass" style={{ borderRadius: 16, padding: 24 }}>
              <h3 className="text-label" style={{ color: 'var(--color-on-muted)', marginBottom: 16 }}>CHRONOTYPE PROFILE</h3>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: CHRONOTYPE.color }}>
                  {CHRONOTYPE.icon}
                </span>
                <p className="text-label" style={{ color: CHRONOTYPE.color, marginTop: 12, fontSize: 13 }}>{CHRONOTYPE.type}</p>
                <p className="text-mono" style={{ color: 'var(--color-on-muted)', marginTop: 8, fontSize: 12 }}>
                  Peak: {CHRONOTYPE.peak}
                </p>
                <p className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>
                  Secondary: {CHRONOTYPE.secondary}
                </p>
              </div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Optimal deep-work window', value: CHRONOTYPE.peak },
                  { label: 'Avoid complex tasks after', value: '21:00' },
                  { label: 'Recommended sleep time',   value: '22:30' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 11 }}>{label}</span>
                    <span className="text-mono" style={{ color: 'var(--color-on-surface)', fontSize: 11 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Avg multiplier */}
            <div className="glass-active" style={{ borderRadius: 16, padding: 24, textAlign: 'center' }}>
              <p className="text-label" style={{ color: 'var(--color-on-muted)', marginBottom: 12 }}>PERSONAL VELOCITY MULTIPLIER</p>
              <span className="text-display" style={{ color: 'var(--color-primary)', fontSize: 40 }}>
                ×{avgMultiplier.toFixed(2)}
              </span>
              <p className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12, marginTop: 8 }}>
                Your tasks take {((avgMultiplier - 1) * 100).toFixed(0)}% longer than estimated
              </p>
            </div>
          </div>

          {/* Velocity Insights Table */}
          <div className="glass" style={{ gridColumn: 'span 12', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(78,222,163,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: 18 }}>speed</span>
              <span className="text-label" style={{ color: 'var(--color-on-muted)' }}>VELOCITY INSIGHTS — HISTORICAL NORMALIZATION</span>
            </div>
            <table className="kronos-table">
              <thead>
                <tr>
                  <th>Task Type</th>
                  <th style={{ width: 120 }}>Estimated (h)</th>
                  <th style={{ width: 120 }}>Actual (h)</th>
                  <th style={{ width: 140 }}>Multiplier</th>
                  <th style={{ width: 200 }}>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {VELOCITY_DATA.map(v => (
                  <tr key={v.task}>
                    <td style={{ color: 'var(--color-on-surface)' }}>{v.task}</td>
                    <td style={{ color: 'var(--color-on-muted)' }}>{v.estimated}h</td>
                    <td style={{ color: 'var(--color-tertiary)' }}>{v.actual}h</td>
                    <td style={{ color: v.multiplier > 1.5 ? 'var(--color-error)' : v.multiplier > 1.3 ? '#fbbf24' : 'var(--color-primary)' }}>
                      ×{v.multiplier.toFixed(2)}
                    </td>
                    <td>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${Math.min(100, (v.estimated / v.actual) * 100)}%`,
                          background: v.multiplier > 1.5 ? 'var(--color-error)' : v.multiplier > 1.3 ? '#fbbf24' : 'var(--color-primary)',
                          borderRadius: 3,
                          boxShadow: `0 0 6px currentColor`,
                        }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
