'use client'
import { useState } from 'react'
import TopNav from '@/components/layout/TopNav'
import SideNav from '@/components/layout/SideNav'
import DialGauge from '@/components/ui/DialGauge'
import Link from 'next/link'
import { api, ApiError } from '@/lib/api/client'
import { useStore, toOptimizeTasks, toSimulateTasks } from '@/lib/store/TaskStore'
import type { ScheduledBlockOut } from '@/lib/api/types'

const heatToColor = (heat: string): string => {
  const h = heat.toLowerCase()
  if (h.includes('red')) return 'var(--color-error)'
  if (h.includes('amber') || h.includes('orange') || h.includes('yellow')) return '#fbbf24'
  return 'var(--color-primary)'
}

function dailyLoads(blocks: ScheduledBlockOut[]) {
  const byDate = new Map<string, { hours: number; heat: string }>()
  for (const b of blocks) {
    const cur = byDate.get(b.date) ?? { hours: 0, heat: b.heat_color }
    cur.hours += b.end_hour - b.start_hour
    byDate.set(b.date, cur)
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))
}

export default function Arbitrage() {
  const { tasks, userId, lastArbitrage, setLastArbitrage, lastSimulation, setLastSimulation } = useStore()
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [committing, setCommitting] = useState(false)
  const [commitMsg, setCommitMsg] = useState<string | null>(null)

  const arb = lastArbitrage
  const sim = lastSimulation
  const rp = sim ? Math.round(sim.path_resilience) : 0
  const entropy = arb ? Math.round(arb.final_sc * 10) / 10 : sim ? Math.round(sim.avg_sc * 10) / 10 : 0

  const executeArbitrage = async () => {
    if (tasks.length === 0) {
      setError('No tasks to optimise — ingest a syllabus or brain-dump first.')
      return
    }
    setError(null)
    setCommitMsg(null)
    setRunning(true)
    try {
      const [arbRes, simRes] = await Promise.all([
        api.arbitrage({
          tasks: toOptimizeTasks(tasks),
          fixed_events: [],
          n_days: 14,
          user_id: userId ?? undefined,
        }),
        api.simulate({ tasks: toSimulateTasks(tasks), n_runs: 50, hours_of_sleep: 7 }),
      ])
      setLastArbitrage(arbRes)
      setLastSimulation(simRes)
    } catch (e) {
      setError(e instanceof ApiError ? `Arbitrage failed: ${e.message}` : 'Arbitrage failed.')
    } finally {
      setRunning(false)
    }
  }

  const commit = async () => {
    if (!userId || !arb?.scenario_cache_id) return
    setCommitting(true)
    setCommitMsg(null)
    try {
      await api.commit({ user_id: userId, scenario_cache_id: arb.scenario_cache_id })
      setCommitMsg('Schedule written to your Google Calendar.')
    } catch (e) {
      setCommitMsg(e instanceof ApiError ? `Commit failed: ${e.message}` : 'Commit failed.')
    } finally {
      setCommitting(false)
    }
  }

  const loads = arb ? dailyLoads(arb.scheduled) : []
  const maxHours = Math.max(...loads.map(l => l.hours), 1)

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
              Deterministic constraint solver — slides {tasks.length} flexible deep-work blocks into safe windows while
              guaranteeing your sleep floor. Zero LLM calls; pure scipy optimisation.
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
            {running ? 'OPTIMISING…' : arb ? 'RE-RUN ARBITRAGE' : 'EXECUTE ARBITRAGE'}
          </button>
        </div>

        {error && (
          <div style={{
            marginBottom: 24, padding: '12px 20px', borderRadius: 10,
            background: 'rgba(255,119,138,0.08)', border: '1px solid rgba(255,119,138,0.3)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-error)', fontSize: 20 }}>error</span>
            <span className="text-mono" style={{ color: 'var(--color-error)' }}>{error}</span>
          </div>
        )}

        {/* Status banner */}
        {arb && !error && (
          <div style={{
            marginBottom: 24, padding: '12px 20px', borderRadius: 10,
            background: 'rgba(78,222,163,0.08)', border: '1px solid rgba(78,222,163,0.25)',
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: 20 }}>check_circle</span>
            <span className="text-mono" style={{ color: 'var(--color-primary)' }}>
              ARBITRAGE {arb.status.toUpperCase()} — {arb.scheduled.length} blocks across {arb.total_days} days.
              Sleep guarantee: {arb.sleep_guarantee_hours}h/night.
              {arb.unscheduled_ids.length > 0 ? ` ${arb.unscheduled_ids.length} could not fit.` : ' All tasks placed.'}
            </span>
            {userId && arb.scenario_cache_id != null && (
              <button
                className="btn-ghost"
                onClick={commit}
                disabled={committing}
                style={{ marginLeft: 'auto', padding: '6px 16px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>event_available</span>
                {committing ? 'WRITING…' : 'COMMIT TO CALENDAR'}
              </button>
            )}
          </div>
        )}
        {commitMsg && (
          <div style={{ marginBottom: 24, padding: '10px 18px', borderRadius: 10, background: 'rgba(189,194,255,0.08)', border: '1px solid rgba(189,194,255,0.25)' }}>
            <span className="text-mono" style={{ color: 'var(--color-secondary)', fontSize: 12 }}>{commitMsg}</span>
          </div>
        )}

        {/* Bento grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
          {/* Path Resilience Dial */}
          <div className="glass" style={{ gridColumn: 'span 4', borderRadius: 20, padding: 24, minHeight: 300, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <DialGauge value={rp} label="Path Resilience" sublabel={rp >= 80 ? 'OPTIMAL' : rp >= 50 ? 'STABLE' : rp > 0 ? 'AT RISK' : 'NO DATA'} variant={rp >= 50 ? 'primary' : 'error'} />
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>
                {sim ? `${sim.survival_count}/${sim.total_runs} survived` : 'Run to populate'}
              </span>
              <span className="text-mono" style={{ color: 'var(--color-primary)', fontSize: 12 }}>
                {sim ? 'live Monte Carlo' : '—'}
              </span>
            </div>
          </div>

          {/* System Entropy Dial */}
          <div className="glass" style={{ gridColumn: 'span 4', borderRadius: 20, padding: 24, minHeight: 300, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <DialGauge value={entropy} max={15} label="System Entropy" sublabel={entropy < 6 ? 'STABLE' : entropy < 10 ? 'ELEVATED' : 'CRITICAL'} unit=" Sc" variant="secondary" />
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>Context-switch tax</span>
              <span className="text-mono" style={{ color: 'var(--color-secondary)', fontSize: 12 }}>
                {arb ? 'optimised' : '—'}
              </span>
            </div>
          </div>

          {/* Schedule Analysis */}
          <div className="glass" style={{ gridColumn: 'span 4', borderRadius: 20, padding: 24, minHeight: 300, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, background: 'rgba(78,222,163,0.04)', borderRadius: '0 0 0 100%', filter: 'blur(20px)' }} />
            <h3 className="text-label" style={{ color: 'var(--color-on-muted)', marginBottom: 20 }}>SCHEDULE ANALYSIS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: 'view_agenda', sector: 'Blocks Scheduled', value: arb ? String(arb.scheduled.length) : '—', color: 'var(--color-primary)' },
                { icon: 'calendar_month', sector: 'Days Span', value: arb ? String(arb.total_days) : '—', color: 'var(--color-secondary)' },
                { icon: 'bedtime', sector: 'Sleep Guarantee', value: arb ? `${arb.sleep_guarantee_hours}h` : '—', color: '#fbbf24' },
                { icon: 'error', sector: 'Unscheduled', value: arb ? String(arb.unscheduled_ids.length) : '—', color: arb && arb.unscheduled_ids.length ? 'var(--color-error)' : 'var(--color-on-muted)' },
              ].map(n => (
                <div
                  key={n.sector}
                  style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ color: n.color, fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
                    <span style={{ color: 'var(--color-on-surface)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', flex: 1, whiteSpace: 'nowrap' }}>{n.sector}</span>
                    <span className="text-mono" style={{ color: n.color, fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{n.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Projection — real daily load */}
          <div className="glass" style={{ gridColumn: 'span 12', borderRadius: 20, padding: 24, minHeight: 280, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 className="text-label" style={{ color: 'var(--color-on-muted)' }}>DAILY DEEP-WORK LOAD PROJECTION</h3>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { dot: 'var(--color-primary)', label: 'Light' },
                  { dot: '#fbbf24', label: 'Moderate' },
                  { dot: 'var(--color-error)', label: 'Heavy' },
                ].map(({ dot, label }) => (
                  <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
                    <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 11 }}>{label}</span>
                  </span>
                ))}
              </div>
            </div>

            {loads.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 13 }}>
                  Run arbitrage to project your daily cognitive load across the planning window.
                </span>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 8, paddingBottom: 28, position: 'relative' }}>
                {loads.map((l, i) => {
                  const c = heatToColor(l.heat)
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                      <span className="text-mono" style={{ color: c, fontSize: 10, marginBottom: 4 }}>{l.hours}h</span>
                      <div
                        title={`${l.date}: ${l.hours}h scheduled`}
                        style={{
                          width: '70%', height: `${Math.max(6, (l.hours / maxHours) * 88)}%`,
                          background: `${c}30`, border: `1px solid ${c}`,
                          borderRadius: '4px 4px 0 0', boxShadow: `0 -2px 10px ${c}40`,
                        }}
                      />
                      <span className="text-mono" style={{ position: 'absolute', bottom: -22, color: 'rgba(187,202,191,0.5)', fontSize: 9 }}>{l.date.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer nav */}
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button className="btn-ghost" style={{ padding: '12px 32px' }}>VIEW SHADOW CALENDAR</button>
          </Link>
          <Link href="/sandbox" style={{ textDecoration: 'none' }}>
            <button className="btn-ghost" style={{ padding: '12px 32px' }}>STRESS-TEST THIS SCHEDULE</button>
          </Link>
        </div>
      </main>
    </div>
  )
}
