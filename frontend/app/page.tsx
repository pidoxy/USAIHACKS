'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import { api, ApiError } from '@/lib/api/client'
import {
  useStore,
  withIds,
  weightToStress,
  stressToWeight,
  STRESS_LABELS,
  type StressLabel,
} from '@/lib/store/TaskStore'

export default function IngestionGateway() {
  const { tasks, addTasks, removeTask, updateTask, hydrated } = useStore()
  const [brainDump, setBrainDump] = useState('')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [processed, setProcessed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [textBusy, setTextBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const ingestFile = async (file: File) => {
    setError(null)
    setFileName(file.name)
    setProcessing(true)
    setProcessed(false)
    try {
      const res = await api.ingestPdf(file)
      addTasks(withIds(res.tasks))
      setProcessed(true)
    } catch (e) {
      setError(
        e instanceof ApiError
          ? `PDF ingestion failed: ${e.message}`
          : 'PDF ingestion failed.',
      )
    } finally {
      setProcessing(false)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) ingestFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) ingestFile(file)
  }

  const ingestText = async () => {
    if (!brainDump.trim() || textBusy) return
    setError(null)
    setTextBusy(true)
    try {
      const res = await api.ingestText(brainDump.trim())
      addTasks(withIds(res.tasks))
      setBrainDump('')
    } catch (e) {
      setError(
        e instanceof ApiError
          ? `Text extraction failed: ${e.message}`
          : 'Text extraction failed.',
      )
    } finally {
      setTextBusy(false)
    }
  }

  return (
    <AppShell>
      <div className="page-stack" style={{ position: 'relative', zIndex: 1 }}>
        <section className="page-hero">
          <span className="hero-kicker">Signal ingestion</span>
          <div className="hero-title-row">
            <div className="hero-copy">
              <h1 className="text-headline" style={{ color: 'var(--color-on-surface)', marginBottom: 8 }}>
                Add your tasks and turn them into a clear study plan
              </h1>
              <p className="text-body" style={{ maxWidth: 760 }}>
                Paste your notes, upload a syllabus, or drop in a messy task list. KRONOS will pull out due dates,
                study time, and task difficulty so you can plan faster.
              </p>
            </div>
            <div className="hero-actions">
              <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                <button className="btn-primary">Go to Overview</button>
              </Link>
            </div>
          </div>
          <div className="hero-meta">
            <span className="meta-pill">{tasks.length} tasks loaded</span>
            <span className="meta-pill">{processing || textBusy ? 'Reading your input' : 'Ready for new tasks'}</span>
          </div>
        </section>

        <div>
          <h1 className="text-headline" style={{ color: 'var(--color-on-surface)', marginBottom: 8 }}>
            Add Tasks
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)' }} className="pulse" />
            <span className="text-mono" style={{ color: 'var(--color-on-muted)' }}>
              {processing || textBusy ? 'Reading your input…' : 'Ready when you are'}
            </span>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            marginBottom: 20, padding: '12px 20px', borderRadius: 10,
            background: 'rgba(255,119,138,0.08)', border: '1px solid rgba(255,119,138,0.3)',
            display: 'flex', alignItems: 'center', gap: 12, maxWidth: 1200,
          }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-error)', fontSize: 20 }}>error</span>
            <span className="text-mono" style={{ color: 'var(--color-error)', fontSize: 12 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          </div>
        )}

        <div className="content-split" style={{ maxWidth: 1320 }}>
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
                onClick={() => !processing && fileRef.current?.click()}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-primary)', marginBottom: 16, opacity: dragging ? 1 : 0.5 }}>
                  upload_file
                </span>
                {processing ? (
                  <>
                    <p className="text-mono" style={{ color: 'var(--color-primary)' }}>Reading: {fileName}</p>
                    <p className="text-label" style={{ color: 'var(--color-on-muted)', marginTop: 8 }}>Pulling out tasks and due dates…</p>
                    <div style={{ marginTop: 16, height: 2, width: 200, background: 'rgba(78,222,163,0.15)', borderRadius: 1, overflow: 'hidden' }}>
                      <div className="indeterminate-bar" style={{ height: '100%', background: 'var(--color-primary)', borderRadius: 1 }} />
                    </div>
                  </>
                ) : processed ? (
                  <>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: 24 }}>check_circle</span>
                    <p className="text-mono" style={{ color: 'var(--color-primary)', marginTop: 8 }}>{fileName} added</p>
                    <p className="text-label" style={{ color: 'var(--color-on-muted)', marginTop: 4 }}>Tasks added to your list</p>
                  </>
                ) : (
                  <>
                    <p className="text-mono" style={{ color: 'var(--color-on-surface)' }}>Upload a PDF syllabus</p>
                    <p className="text-label" style={{ color: 'var(--color-on-muted)', marginTop: 8 }}>Or tap to choose a file</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileSelect} />
            </div>

            {/* Brain Dump */}
            <div className="glass" style={{ borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="text-label" style={{ color: 'var(--color-primary)', display: 'block', marginBottom: 10 }}>Quick Task Paste</label>
                <textarea
                  className="kronos-input"
                  style={{ height: 120, resize: 'none', width: '100%' }}
                  placeholder="Paste assignments, reminders, deadlines, or anything you need to get done…"
                  value={brainDump}
                  onChange={e => setBrainDump(e.target.value)}
                  onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') ingestText() }}
                />
              </div>
              <button
                className="btn-primary"
                onClick={ingestText}
                disabled={textBusy || !brainDump.trim()}
                style={{ padding: '12px 0', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, opacity: textBusy || !brainDump.trim() ? 0.6 : 1 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{textBusy ? 'sync' : 'auto_awesome'}</span>
                {textBusy ? 'ADDING…' : 'ADD TASKS'}
              </button>
            </div>
          </div>

          {/* Right: Extracted Tasks Table */}
          <div className="glass" style={{ borderRadius: 16, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid rgba(78,222,163,0.12)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(20,27,44,0.5)',
            }}>
              <span className="text-label" style={{ color: 'var(--color-primary)' }}>Task List</span>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(78,222,163,0.08)', border: '1px solid rgba(78,222,163,0.2)',
                borderRadius: 8, padding: '4px 12px',
              }}>
                <span className="text-label" style={{ color: 'var(--color-on-muted)', fontSize: 9 }}>Tasks:</span>
                <span className="text-mono" style={{ color: 'var(--color-primary)' }}>{tasks.length}</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-secondary)' }} />
              </div>
            </div>
            <table className="kronos-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col />
                <col style={{ width: 68 }} />
                <col style={{ width: 56 }} />
                <col style={{ width: 124 }} />
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
                    <td style={{ color: 'var(--color-secondary)', whiteSpace: 'nowrap' }}>{t.due_date.slice(5)}</td>
                    <td style={{ color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>{t.workload_hours}h</td>
                    <td style={{ padding: '6px 8px' }}>
                      <select
                        className="kronos-input"
                        style={{ padding: '3px 4px', fontSize: 11, width: '100%' }}
                        value={weightToStress(t.cognitive_weight)}
                        onChange={e => updateTask(t.id, { cognitive_weight: stressToWeight(e.target.value as StressLabel) })}
                      >
                        {(['high', 'medium', 'low'] as StressLabel[]).map(o => (
                          <option key={o} value={o}>{STRESS_LABELS[o]}</option>
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
                {hydrated && tasks.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-on-muted)', padding: '32px 0' }}>
                      <span className="text-mono" style={{ fontSize: 12 }}>No tasks yet. Upload a file or paste your list above.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="action-row" style={{ marginTop: 16, alignItems: 'center' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '16px 48px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>bolt</span>
              Continue to Overview
            </button>
          </Link>
          <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 12 }}>
            {tasks.length} tasks loaded
          </span>
        </div>

        {/* Feature cards */}
        <div className="feature-grid" style={{ maxWidth: 1320 }}>
          {[
            { icon: 'psychology', title: 'Energy-aware planning', desc: 'Balance workload with how demanding tasks feel', color: 'var(--color-primary)' },
            { icon: 'casino',      title: 'Stress testing', desc: 'Try your plan against rough weeks before they happen', color: 'var(--color-secondary)' },
            { icon: 'tune',        title: 'Calendar-friendly plan', desc: 'Build study blocks around classes and events', color: '#fbbf24' },
            { icon: 'speed',       title: 'Personal pacing', desc: 'Learn how long your work really takes', color: 'var(--color-tertiary)' },
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
      </div>

      <style>{`
        @keyframes indeterminate { 0% { transform: translateX(-100%) } 100% { transform: translateX(300%) } }
        .indeterminate-bar { width: 33%; animation: indeterminate 1.1s ease-in-out infinite; }
      `}</style>
    </AppShell>
  )
}
