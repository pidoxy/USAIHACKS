'use client'
import { useState, useRef } from 'react'
import TopNav from '@/components/layout/TopNav'
import Link from 'next/link'

const DEMO_TASKS = [
  { id: '1', title: 'Advanced Calc Midterm Prep', due: '2026-06-28', hours: 12.0, stress: 'High Stress' },
  { id: '2', title: 'Read Chapter 4: Thermodynamics', due: '2026-06-22', hours: 3.5, stress: 'Moderate Focus' },
  { id: '3', title: 'Lab Report: Circuit Analysis', due: '2026-06-25', hours: 6.0, stress: 'Moderate Focus' },
]

export default function IngestionGateway() {
  const [tasks, setTasks] = useState(DEMO_TASKS)
  const [brainDump, setBrainDump] = useState('')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [processed, setProcessed] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) simulateProcessing(file.name)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) simulateProcessing(file.name)
  }

  const simulateProcessing = (name: string) => {
    setFileName(name)
    setProcessing(true)
    setProcessed(false)
    setTimeout(() => {
      setProcessing(false)
      setProcessed(true)
    }, 2200)
  }

  const removeTask = (id: string) => setTasks(t => t.filter(x => x.id !== id))

  const stressColor = (s: string) =>
    s.includes('High') ? 'var(--color-error)' : s.includes('Moderate') ? '#fbbf24' : 'var(--color-primary)'

  return (
    <div style={{ minHeight: '100vh' }}>
      <TopNav />

      {/* Math watermark */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        fontFamily: 'var(--font-mono)', fontSize: 120,
        color: 'rgba(78,222,163,0.025)',
        whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0, userSelect: 'none',
      }}>
        ΔS = k_B ln(Ω) + ∫(∂Q/T)dt
      </div>

      <main style={{ paddingTop: 160, paddingLeft: 48, paddingRight: 48, paddingBottom: 48, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 className="text-headline" style={{ color: 'var(--color-on-surface)', marginBottom: 8 }}>
            Ingestion Gateway
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)' }} className="pulse" />
            <span className="text-mono" style={{ color: 'var(--color-on-muted)' }}>
              AWAITING DATA INPUT [SYS.READY]
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, maxWidth: 1200 }}>
          {/* Left: Upload Zone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Drop Zone */}
            <div
              className="glass"
              style={{ borderRadius: 16, padding: 32 }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleFileDrop}
            >
              <div
                style={{
                  border: `2px dashed ${dragging ? 'var(--color-primary)' : 'rgba(78,222,163,0.25)'}`,
                  borderRadius: 12,
                  padding: '48px 24px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  cursor: 'pointer',
                  background: dragging ? 'rgba(78,222,163,0.05)' : 'transparent',
                  transition: 'all 0.2s',
                }}
                onClick={() => fileRef.current?.click()}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-primary)', marginBottom: 16, opacity: dragging ? 1 : 0.5 }}>
                  upload_file
                </span>
                {processing ? (
                  <>
                    <p className="text-mono" style={{ color: 'var(--color-primary)' }}>PROCESSING: {fileName}</p>
                    <p className="text-label" style={{ color: 'var(--color-on-muted)', marginTop: 8 }}>LLM EXTRACTING CONSTRAINTS…</p>
                    <div style={{ marginTop: 16, height: 2, width: 200, background: 'rgba(78,222,163,0.15)', borderRadius: 1, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--color-primary)', borderRadius: 1, animation: 'progressBar 2.2s linear forwards', width: '0%' }} />
                    </div>
                  </>
                ) : processed ? (
                  <>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: 24 }}>check_circle</span>
                    <p className="text-mono" style={{ color: 'var(--color-primary)', marginTop: 8 }}>{fileName} — PARSED</p>
                    <p className="text-label" style={{ color: 'var(--color-on-muted)', marginTop: 4 }}>CONSTRAINTS EXTRACTED TO TABLE</p>
                  </>
                ) : (
                  <>
                    <p className="text-mono" style={{ color: 'var(--color-on-surface)' }}>DROP PDF SYLLABUS HERE</p>
                    <p className="text-label" style={{ color: 'var(--color-on-muted)', marginTop: 8 }}>OR CLICK TO BROWSE</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileSelect} />
            </div>

            {/* Brain Dump + Voice */}
            <div className="glass" style={{ borderRadius: 16, padding: 24, display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label className="text-label" style={{ color: 'var(--color-primary)', display: 'block', marginBottom: 10 }}>BRAIN DUMP</label>
                <textarea
                  className="kronos-input"
                  style={{ height: 120, resize: 'none' }}
                  placeholder="Enter unstructured tasks, thoughts, deadlines, raw data…"
                  value={brainDump}
                  onChange={e => setBrainDump(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                <button className="glass" style={{
                  width: 56, height: 56, borderRadius: '50%', border: '1px solid rgba(78,222,163,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--color-primary)', transition: 'all 0.2s',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28 }}>mic</span>
                </button>
                <span className="text-label" style={{ color: 'var(--color-primary)', fontSize: 9 }}>VOICE</span>
              </div>
            </div>
          </div>

          {/* Right: Extracted Tasks Table */}
          <div className="glass" style={{ borderRadius: 16, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid rgba(78,222,163,0.12)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(20,27,44,0.5)',
            }}>
              <span className="text-label" style={{ color: 'var(--color-primary)' }}>EXTRACTED TASKS [VALIDATION REQ]</span>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(78,222,163,0.08)', border: '1px solid rgba(78,222,163,0.2)',
                borderRadius: 8, padding: '4px 12px',
              }}>
                <span className="text-label" style={{ color: 'var(--color-on-muted)', fontSize: 9 }}>PR:</span>
                <span className="text-mono" style={{ color: 'var(--color-primary)' }}>87.4%</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-secondary)' }} />
              </div>
            </div>
            <table className="kronos-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col />
                <col style={{ width: 68 }} />
                <col style={{ width: 56 }} />
                <col style={{ width: 112 }} />
                <col style={{ width: 34 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Due</th>
                  <th>h</th>
                  <th>Stress Level</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id}>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.title}>{t.title}</td>
                    <td style={{ color: 'var(--color-secondary)', whiteSpace: 'nowrap' }}>{t.due.slice(5)}</td>
                    <td style={{ color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>{t.hours}h</td>
                    <td style={{ padding: '6px 8px' }}>
                      <select className="kronos-input" style={{ padding: '3px 4px', fontSize: 11, width: '100%' }} defaultValue={t.stress}>
                        {['High Stress', 'Moderate Focus', 'Light/Easy'].map(o => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: 'center', padding: '4px 2px' }}>
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer' }}
                        onClick={() => removeTask(t.id)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 40, display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '16px 48px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>bolt</span>
              ENGAGE KRONOS ENGINE
            </button>
          </Link>
          <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>
            {tasks.length} constraints loaded — deterministic simulation ready
          </span>
        </div>

        {/* Feature cards */}
        <div style={{ marginTop: 64, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 1200 }}>
          {[
            { icon: 'psychology', title: 'Chrono-Kinetic Entropy', desc: 'Mathematical fatigue curves — not guesswork', color: 'var(--color-primary)' },
            { icon: 'casino',      title: 'Monte Carlo Crisis', desc: '50 adversarial simulations against your schedule', color: 'var(--color-secondary)' },
            { icon: 'tune',        title: 'Constraint Solver', desc: 'Auto-optimises deep-work blocks for 7h+ sleep', color: '#fbbf24' },
            { icon: 'speed',       title: 'Velocity Normalizer', desc: 'Your personal under-estimation multiplier', color: 'var(--color-tertiary)' },
          ].map(card => (
            <div key={card.title} className="glass" style={{ borderRadius: 16, padding: 24 }}>
              <span className="material-symbols-outlined" style={{ color: card.color, fontSize: 28, marginBottom: 12, display: 'block' }}>
                {card.icon}
              </span>
              <p className="text-label" style={{ color: 'var(--color-on-surface)', marginBottom: 8, fontSize: 11 }}>{card.title}</p>
              <p className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        @keyframes progressBar { from { width: 0% } to { width: 100% } }
      `}</style>
    </div>
  )
}
