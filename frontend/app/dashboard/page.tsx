'use client'
import TopNav from '@/components/layout/TopNav'
import SideNav from '@/components/layout/SideNav'
import Link from 'next/link'

const TASKS = [
  { id: '1', label: 'URGENT',  title: 'Model Retraining',         est: '1.5h',  color: 'var(--color-error)' },
  { id: '2', label: 'HIGH',    title: 'Log Analysis',             est: '45m',   color: 'var(--color-tertiary)' },
  { id: '3', label: 'NORMAL',  title: 'Data Ingestion Review',    est: '20m',   color: 'var(--color-primary)' },
  { id: '4', label: 'HIGH',    title: 'Algorithm Optimization',   est: '1h',    color: 'var(--color-tertiary)' },
  { id: '5', label: 'NORMAL',  title: 'System Health Check',      est: '15m',   color: 'var(--color-primary)' },
]

const CALENDAR_BLOCKS = [
  { label: 'Morning Sync',        subLabel: 'Low Load',    top: '8%',  height: 80,  color: 'var(--color-primary)' },
  { label: 'Deep Work: Strategy', subLabel: 'High Load',   top: '28%', height: 120, color: 'var(--color-tertiary)' },
  { label: 'Critical Review',     subLabel: 'Severe Load', top: '62%', height: 90,  color: 'var(--color-error)' },
  { label: 'Admin & Follow-ups',  subLabel: 'Low Load',    top: '80%', height: 60,  color: 'var(--color-primary)' },
]

export default function Dashboard() {
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
              <p className="text-label" style={{ color: 'var(--color-on-muted)', marginBottom: 20 }}>COGNITIVE LOAD WARNING</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 20 }}>
                <span className="text-display" style={{ color: 'var(--color-error)', fontSize: 52 }}>4.2h</span>
                <span className="text-mono" style={{ color: 'var(--color-on-muted)', paddingBottom: 6 }}>accumulated</span>
              </div>
              {/* Load bar */}
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: '25%', height: '100%', background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)' }} />
                <div style={{ width: '40%', height: '100%', background: 'var(--color-tertiary)', boxShadow: '0 0 8px var(--color-tertiary)' }} />
                <div style={{ width: '35%', height: '100%', background: 'var(--color-error)', boxShadow: '0 0 8px var(--color-error)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                {['Safe', 'Warning', 'Critical'].map(l => (
                  <span key={l} className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 11 }}>{l}</span>
                ))}
              </div>
            </div>

            {/* Priority Queue */}
            <div className="glass" style={{ borderRadius: 16, padding: 24, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="text-headline-sm" style={{ color: 'var(--color-on-surface)' }}>Priority Queue</h3>
                <button style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>filter_list</span>
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1 }}>
                {TASKS.map(task => (
                  <div
                    key={task.id}
                    style={{
                      padding: '14px 16px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'background 0.2s', cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span
                        className="chip"
                        style={{ color: task.color, background: `${task.color}18`, width: 'fit-content' }}
                      >{task.label}</span>
                      <span className="text-body" style={{ color: 'var(--color-on-surface)', fontSize: 14 }}>{task.title}</span>
                      <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>Est. {task.est}</span>
                    </div>
                    <button
                      style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'var(--color-surface-mid)', border: '1px solid rgba(255,255,255,0.08)',
                        color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>
                    </button>
                  </div>
                ))}
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
              <h2 className="text-headline-sm" style={{ color: 'var(--color-on-surface)' }}>Shadow Calendar</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Day', 'Week'].map(v => (
                  <button
                    key={v}
                    className={v === 'Week' ? 'btn-ghost' : ''}
                    style={{
                      padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                      background: v === 'Week' ? 'rgba(78,222,163,0.12)' : 'rgba(255,255,255,0.04)',
                      border: v === 'Week' ? '1px solid rgba(78,222,163,0.3)' : '1px solid rgba(255,255,255,0.08)',
                      color: v === 'Week' ? 'var(--color-primary)' : 'var(--color-on-muted)',
                    }}
                  >{v}</button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid rgba(255,255,255,0.08)', marginLeft: 64 }}>
              {/* Time markers */}
              {[['08:00', '0%'], ['12:00', '25%'], ['16:00', '50%'], ['20:00', '75%']].map(([t, top]) => (
                <div key={t} style={{ position: 'absolute', left: -64, top, width: 48, textAlign: 'right' }}>
                  <span className="text-mono" style={{ color: 'rgba(187,202,191,0.4)', fontSize: 11 }}>{t}</span>
                </div>
              ))}

              {/* Horizontal grid lines */}
              {['25%','50%','75%'].map(top => (
                <div key={top} style={{ position: 'absolute', top, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.04)' }} />
              ))}

              {/* Current time indicator */}
              <div style={{
                position: 'absolute', top: '30%', left: 0, right: 0, height: 1,
                background: 'rgba(78,222,163,0.5)', zIndex: 10,
                boxShadow: '0 0 8px rgba(78,222,163,0.8)',
              }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: 'var(--color-primary)', boxShadow: '0 0 12px var(--color-primary)',
                  position: 'absolute', top: -6, left: -6,
                }} />
              </div>

              {/* Calendar blocks */}
              {CALENDAR_BLOCKS.map(block => (
                <div
                  key={block.label}
                  className="timeline-block"
                  style={{
                    top: block.top, height: block.height,
                    background: `${block.color}18`,
                    border: `1px solid ${block.color}35`,
                  }}
                >
                  <span className="text-body" style={{ color: block.color, fontWeight: 600, fontSize: 14 }}>{block.label}</span>
                  <span className="text-mono" style={{ color: `${block.color}90`, fontSize: 11 }}>{block.subLabel}</span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                { label: 'Low Load',    color: 'var(--color-primary)' },
                { label: 'High Load',   color: 'var(--color-tertiary)' },
                { label: 'Severe Load', color: 'var(--color-error)' },
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
