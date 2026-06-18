'use client'
import { useState } from 'react'
import TopNav from '@/components/layout/TopNav'
import SideNav from '@/components/layout/SideNav'
import { runMonteCarlo } from '@/lib/engine/monteCarlo'
import type { Crisis } from '@/lib/engine/monteCarlo'
import type { Task } from '@/lib/engine/entropy'

const BASE_TASKS: Task[] = [
  { id: '1', title: 'Advanced Calc Midterm', dueDate: '2026-06-28', hoursEstimated: 12, stressLevel: 'high' },
  { id: '2', title: 'Lab Report',             dueDate: '2026-06-25', hoursEstimated: 6,  stressLevel: 'medium' },
  { id: '3', title: 'Reading Assignment',     dueDate: '2026-06-22', hoursEstimated: 3,  stressLevel: 'low' },
]

const PRESET_CRISES: Crisis[] = [
  { name: 'Client Site Visit',   durationHours: 8,  intensityScore: 6 },
  { name: 'System Outage',       durationHours: 12, intensityScore: 9 },
  { name: 'Unexpected Illness',  durationHours: 48, intensityScore: 7 },
  { name: 'Family Emergency',    durationHours: 24, intensityScore: 8 },
]

const ACTIVE_INJECTS = [
  { name: 'Client Site Visit', status: 'Awaiting Input', intensity: 6, duration: 8 },
]

export default function Sandbox() {
  const [title, setTitle]         = useState('')
  const [duration, setDuration]   = useState('')
  const [intensity, setIntensity] = useState(5)
  const [injects, setInjects]     = useState(ACTIVE_INJECTS)
  const [result, setResult]       = useState<ReturnType<typeof runMonteCarlo> | null>(null)
  const [running, setRunning]     = useState(false)

  const addInject = () => {
    if (!title) return
    setInjects(prev => [...prev, { name: title, status: 'Injected', intensity, duration: Number(duration) || 8 }])
    setTitle(''); setDuration(''); setIntensity(5)
  }

  const runSim = () => {
    setRunning(true)
    const crises: Crisis[] = injects.map(i => ({
      name: i.name, durationHours: i.duration, intensityScore: i.intensity,
    }))
    setTimeout(() => {
      const r = runMonteCarlo(BASE_TASKS, 50, crises)
      setResult(r)
      setRunning(false)
    }, 1800)
  }

  const rpColor = (rp: number) =>
    rp >= 60 ? 'var(--color-primary)' : rp >= 30 ? '#fbbf24' : 'var(--color-error)'

  const survivalColor = (r: number) =>
    r >= 60 ? 'var(--color-primary)' : r >= 30 ? '#fbbf24' : 'var(--color-error)'

  return (
    <div style={{ minHeight: '100vh' }}>
      <TopNav />
      <SideNav />

      <main style={{ paddingTop: 160, paddingLeft: 120, paddingRight: 48, paddingBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <h1 className="text-headline" style={{ color: 'var(--color-on-surface)', marginBottom: 6 }}>Scenario Sandbox</h1>
            <p className="text-mono" style={{ color: 'var(--color-on-muted)' }}>
              STRESS-TESTING ENVIRONMENT // SESSION: A-942
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(20,27,44,0.8)', border: '1px solid rgba(78,222,163,0.2)', borderRadius: 8, padding: '6px 14px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)' }} className="pulse" />
            <span className="text-label" style={{ color: 'var(--color-primary)' }}>PR: 98.2%</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
          {/* Left: Inject Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="glass-active" style={{ borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid rgba(78,222,163,0.12)', paddingBottom: 16 }}>
                <h3 className="text-label" style={{ color: 'var(--color-on-surface)' }}>TACTICAL INJECT</h3>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: 20 }}>add_box</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="text-label" style={{ color: 'var(--color-on-muted)', display: 'block', marginBottom: 8 }}>HYPOTHESIS TITLE</label>
                  <input className="kronos-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Unexpected Illness" />
                </div>
                <div>
                  <label className="text-label" style={{ color: 'var(--color-on-muted)', display: 'block', marginBottom: 8 }}>DURATION (HRS)</label>
                  <input className="kronos-input" type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="24" />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label className="text-label" style={{ color: 'var(--color-on-muted)' }}>INTENSITY VECTOR</label>
                    <span className="text-mono" style={{ color: intensity >= 7 ? 'var(--color-error)' : intensity >= 4 ? '#fbbf24' : 'var(--color-primary)', fontSize: 13 }}>
                      {intensity >= 7 ? 'CRITICAL' : intensity >= 4 ? 'HIGH' : 'LOW'} ({intensity})
                    </span>
                  </div>
                  <input
                    type="range" min={1} max={10} value={intensity}
                    onChange={e => setIntensity(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                  />
                </div>
                <button className="btn-ghost" onClick={addInject} style={{ padding: '12px 0', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>publish</span>
                  INJECT VECTOR
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="glass" style={{ borderRadius: 16, padding: 20 }}>
              <h3 className="text-label" style={{ color: 'var(--color-on-muted)', marginBottom: 14 }}>LOAD PRESET</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PRESET_CRISES.map(c => (
                  <button
                    key={c.name}
                    onClick={() => setInjects(prev => [...prev, { name: c.name, status: 'Preset', intensity: c.intensityScore, duration: c.durationHours }])}
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8, padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
                      color: 'var(--color-on-surface)', fontFamily: 'var(--font-mono)', fontSize: 12,
                      transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(78,222,163,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  >
                    {c.name}
                    <span className="text-label" style={{ color: 'var(--color-on-muted)', fontSize: 9 }}>×{c.intensityScore}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Simulation Canvas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Active Injects */}
            <div className="glass" style={{ borderRadius: 16, padding: 24 }}>
              <h3 className="text-label" style={{ color: 'var(--color-on-muted)', marginBottom: 16 }}>ACTIVE SIMULATED VECTORS</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {injects.map((inj, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: inj.intensity >= 7 ? 'var(--color-error)' : '#fbbf24' }} />
                      <div>
                        <p className="text-body" style={{ color: 'var(--color-on-surface)', fontSize: 14 }}>{inj.name}</p>
                        <p className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 11 }}>{inj.status} · {inj.duration}h · intensity {inj.intensity}/10</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setInjects(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,119,138,0.5)', cursor: 'pointer' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                    </button>
                  </div>
                ))}
                {injects.length === 0 && (
                  <p className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12, padding: '8px 0' }}>No vectors injected yet.</p>
                )}
              </div>
            </div>

            {/* Run button */}
            <button
              className="btn-primary"
              onClick={runSim}
              disabled={running}
              style={{ padding: '16px', width: '100%', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: running ? 0.8 : 1 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{running ? 'sync' : 'rocket_launch'}</span>
              {running ? 'RUNNING 50 ADVERSARIAL SIMULATIONS…' : 'LAUNCH MONTE CARLO SIMULATION (50 RUNS)'}
            </button>

            {/* Results */}
            {result && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
                <div className="glass" style={{ borderRadius: 16, padding: 24 }}>
                  <h4 className="text-label" style={{ color: 'var(--color-on-muted)', marginBottom: 16 }}>SURVIVAL PROBABILITY</h4>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
                    <span className="text-display" style={{ color: survivalColor(result.survivalRate), fontSize: 52 }}>
                      {result.survivalRate}%
                    </span>
                  </div>
                  <p className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>
                    {result.survivalRate >= 60 ? 'Schedule survives most crises.' : result.survivalRate >= 30 ? 'High-risk schedule — intervention needed.' : 'CRITICAL — Schedule failure likely.'}
                  </p>
                </div>

                <div className="glass" style={{ borderRadius: 16, padding: 24 }}>
                  <h4 className="text-label" style={{ color: 'var(--color-on-muted)', marginBottom: 16 }}>ENTROPY ANALYSIS</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Avg Peak Entropy', value: `${result.avgPeakEntropy.toLocaleString()}`, unit: 'Sc' },
                      { label: 'Worst-Case Rp',    value: `${result.worstCaseRp}%`,                   unit: '', color: rpColor(result.worstCaseRp) },
                      { label: 'Best-Case Rp',     value: `${result.bestCaseRp}%`,                    unit: '', color: 'var(--color-primary)' },
                    ].map(({ label, value, unit, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>{label}</span>
                        <span className="text-mono" style={{ color: color || 'var(--color-on-surface)', fontSize: 12 }}>{value} <span style={{ opacity: 0.5 }}>{unit}</span></span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulation run mini bars */}
                <div className="glass" style={{ gridColumn: 'span 2', borderRadius: 16, padding: 24 }}>
                  <h4 className="text-label" style={{ color: 'var(--color-on-muted)', marginBottom: 16 }}>50 SIMULATION RUNS — PATH RESILIENCE DISTRIBUTION</h4>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
                    {result.runs.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1, height: `${Math.max(5, r.finalRp)}%`,
                          background: r.survived ? 'rgba(78,222,163,0.6)' : 'rgba(255,119,138,0.6)',
                          borderRadius: '2px 2px 0 0',
                          boxShadow: r.survived ? '0 -2px 6px rgba(78,222,163,0.3)' : '0 -2px 6px rgba(255,119,138,0.3)',
                        }}
                        title={`Run ${i+1}: Rp=${r.finalRp}% — ${r.survived ? 'SURVIVED' : 'FAILED'}`}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(78,222,163,0.6)' }} />
                      <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 11 }}>Survived</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,119,138,0.6)' }} />
                      <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 11 }}>Failed</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
