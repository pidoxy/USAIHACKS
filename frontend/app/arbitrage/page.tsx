'use client'
import { useState } from 'react'
import TopNav from '@/components/layout/TopNav'
import SideNav from '@/components/layout/SideNav'
import DialGauge from '@/components/ui/DialGauge'

const INITIAL_BARS = [40, 55, 30, 70, 65, 85, 90]
const PROJECTED_BARS = [45, 60, 75]

const NODE_ANALYSIS = [
  { icon: 'hub',          sector: 'Alpha Node', desc: 'Routing Efficiency', value: '99.2%',   color: 'var(--color-primary)' },
  { icon: 'network_node', sector: 'Beta Node',  desc: 'Latency Spike',     value: '42ms',    color: 'var(--color-tertiary)' },
  { icon: 'router',       sector: 'Gamma Node', desc: 'Load Distribution', value: 'Balanced', color: 'var(--color-on-muted)' },
]

export default function Arbitrage() {
  const [running, setRunning] = useState(false)
  const [executed, setExecuted] = useState(false)
  const [rp, setRp] = useState(94)
  const [entropy, setEntropy] = useState(2.4)

  const executeArbitrage = () => {
    setRunning(true)
    setTimeout(() => {
      setRunning(false)
      setExecuted(true)
      setRp(prev => Math.min(99, prev + 3))
      setEntropy(prev => Math.max(0.5, prev - 0.4))
    }, 2000)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <TopNav />
      <SideNav active="Focus Mode" />

      <main style={{ paddingTop: 160, paddingLeft: 120, paddingRight: 48, paddingBottom: 48 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
          <div>
            <h1 className="text-display" style={{ color: 'var(--color-on-surface)', marginBottom: 8 }}>
              Tactical Arbitrage
            </h1>
            <p className="text-body" style={{ color: 'var(--color-on-muted)', maxWidth: 560 }}>
              Real-time path resilience and entropy analysis. System is operating within optimal cognitive comfort parameters.
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={executeArbitrage}
            disabled={running}
            style={{ padding: '18px 40px', display: 'flex', alignItems: 'center', gap: 10, opacity: running ? 0.8 : 1 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {running ? 'sync' : 'bolt'}
            </span>
            {running ? 'OPTIMISING…' : executed ? 'RE-RUN ARBITRAGE' : 'EXECUTE ARBITRAGE'}
          </button>
        </div>

        {/* Status banner */}
        {executed && (
          <div style={{
            marginBottom: 24, padding: '12px 20px', borderRadius: 10,
            background: 'rgba(78,222,163,0.08)', border: '1px solid rgba(78,222,163,0.25)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: 20 }}>check_circle</span>
            <span className="text-mono" style={{ color: 'var(--color-primary)' }}>
              ARBITRAGE COMPLETE — Constraint solver rearranged 3 deep-work blocks. Sleep guarantee: 7.2h/night.
            </span>
          </div>
        )}

        {/* Bento grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
          {/* Path Resilience Dial */}
          <div className="glass" style={{ gridColumn: 'span 4', borderRadius: 20, padding: 24, minHeight: 300, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <DialGauge value={rp} label="Path Resilience" sublabel={rp > 80 ? 'OPTIMAL' : 'WARNING'} variant="primary" />
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>Baseline: 82%</span>
              <span className="text-mono" style={{ color: 'var(--color-primary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_upward</span>
                +{rp - 82}%
              </span>
            </div>
          </div>

          {/* System Entropy Dial */}
          <div className="glass" style={{ gridColumn: 'span 4', borderRadius: 20, padding: 24, minHeight: 300, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <DialGauge value={entropy} max={10} label="System Entropy" sublabel={entropy < 4 ? 'STABLE' : 'ELEVATED'} unit="k" variant="secondary" />
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>Threshold: 4.0k</span>
              <span className="text-mono" style={{ color: 'var(--color-secondary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_downward</span>
                {(4 - entropy).toFixed(1)}k headroom
              </span>
            </div>
          </div>

          {/* Node Analysis */}
          <div className="glass" style={{ gridColumn: 'span 4', borderRadius: 20, padding: 24, minHeight: 300, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, background: 'rgba(78,222,163,0.04)', borderRadius: '0 0 0 100%', filter: 'blur(20px)' }} />
            <h3 className="text-label" style={{ color: 'var(--color-on-muted)', marginBottom: 20 }}>NODE ANALYSIS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {NODE_ANALYSIS.map(n => (
                <div
                  key={n.sector}
                  style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer', transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="material-symbols-outlined" style={{ color: n.color, fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
                    <span style={{ color: 'var(--color-on-surface)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', flex: 1, whiteSpace: 'nowrap' }}>{n.sector}</span>
                    <span className="text-mono" style={{ color: n.color, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{n.value}</span>
                  </div>
                  <p className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 10, paddingLeft: 24 }}>{n.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Projection */}
          <div className="glass" style={{ gridColumn: 'span 12', borderRadius: 20, padding: 24, height: 280, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 className="text-label" style={{ color: 'var(--color-on-muted)' }}>TIMELINE PROJECTION</h3>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { dot: 'rgba(78,222,163,0.5)', label: 'Actual' },
                  { dot: 'transparent', label: 'Projected', dashed: true },
                ].map(({ dot, label, dashed }) => (
                  <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: dot,
                      border: dashed ? '1px dashed rgba(78,222,163,0.5)' : 'none',
                    }} />
                    <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 11 }}>{label}</span>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 12, paddingBottom: 28, position: 'relative' }}>
              {/* NOW marker */}
              <div style={{
                position: 'absolute',
                left: `${(INITIAL_BARS.length / (INITIAL_BARS.length + PROJECTED_BARS.length)) * 100}%`,
                top: 0, bottom: 28, width: 2,
                background: 'rgba(255,178,185,0.7)',
                boxShadow: '0 0 10px rgba(255,178,185,0.5)',
                zIndex: 5,
              }}>
                <span style={{
                  position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(255,178,185,0.15)', border: '1px solid rgba(255,178,185,0.4)',
                  color: 'var(--color-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 10,
                  padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap',
                }}>NOW</span>
              </div>

              {INITIAL_BARS.map((h, i) => (
                <div key={i} className="bar-col" style={{ flex: 1, height: `${h}%` }}>
                  <div className="bar-fill" style={{ height: '100%' }} />
                </div>
              ))}
              {PROJECTED_BARS.map((h, i) => (
                <div key={i} className="bar-col projected" style={{ flex: 1, height: `${h}%` }}>
                  <div className="bar-fill" style={{ height: '100%' }} />
                </div>
              ))}

              {/* X axis */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                display: 'flex', justifyContent: 'space-between',
              }}>
                {['-4h','-3h','-2h','-1h','T-0','+1h','+2h'].map(l => (
                  <span key={l} className="text-mono" style={{ color: 'rgba(187,202,191,0.35)', fontSize: 10 }}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
