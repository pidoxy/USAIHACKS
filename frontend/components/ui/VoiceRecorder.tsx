'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { API_BASE } from '@/lib/api/config'

type RecordState = 'idle' | 'recording' | 'transcribing'

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
  language?: string
}

const SAMPLE_RATE = 16000

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const n = samples.length
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const s = (o: number, str: string) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)) }
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true)
  s(8, 'WAVE'); s(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  s(36, 'data'); v.setUint32(40, n * 2, true)
  let o = 44
  for (let i = 0; i < n; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7FFF, true); o += 2
  }
  return new Blob([buf], { type: 'audio/wav' })
}

export default function VoiceRecorder({ onTranscript, disabled, language = 'en' }: Props) {
  const [state, setState] = useState<RecordState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(0)

  const ctxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const samplesRef = useRef<Float32Array[]>([])
  const animRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    clearInterval(timerRef.current ?? undefined)
    timerRef.current = null
    processorRef.current?.disconnect()
    ctxRef.current?.close().catch(() => null)
    streamRef.current?.getTracks().forEach(t => t.stop())
    processorRef.current = null; ctxRef.current = null; streamRef.current = null
    setVolume(0)
  }, [])

  const stop = useCallback(async () => {
    const captured = [...samplesRef.current]
    samplesRef.current = []
    cleanup()
    setState('transcribing')
    setError(null)

    if (captured.length === 0) {
      setState('idle')
      return
    }

    // Merge all PCM frames into one Float32Array
    const total = captured.reduce((s, a) => s + a.length, 0)
    const merged = new Float32Array(total)
    let offset = 0
    for (const chunk of captured) { merged.set(chunk, offset); offset += chunk.length }

    const wav = encodeWAV(merged, SAMPLE_RATE)
    const form = new FormData()
    form.append('file', wav, 'recording.wav')
    form.append('language', language)

    try {
      const res = await fetch(`${API_BASE}/api/voice/transcribe`, { method: 'POST', body: form })
      if (!res.ok) {
        const detail = await res.json().then((d: { detail?: string }) => d.detail).catch(() => res.statusText)
        throw new Error(detail)
      }
      const data = await res.json() as { transcript: string }
      if (data.transcript?.trim()) {
        onTranscript(data.transcript.trim())
      } else {
        setError('No speech detected — try speaking closer to the mic.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transcription failed.')
    } finally {
      setState('idle')
    }
  }, [cleanup, language, onTranscript])

  const start = useCallback(async () => {
    setError(null)
    setElapsed(0)
    samplesRef.current = []

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      setError('Microphone access denied.')
      return
    }
    streamRef.current = stream

    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
    ctxRef.current = ctx
    const src = ctx.createMediaStreamSource(stream)
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    src.connect(analyser)
    src.connect(processor)
    processor.connect(ctx.destination)

    const freq = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteFrequencyData(freq)
      setVolume(Math.min(freq.reduce((s, v) => s + v, 0) / freq.length / 80, 1))
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)

    processor.onaudioprocess = (e) => {
      samplesRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)))
    }

    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    setState('recording')
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const isRecording = state === 'recording'
  const isBusy = state === 'transcribing'
  const pulseScale = 1 + volume * 0.35
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={isRecording ? stop : start}
          disabled={disabled || isBusy}
          title={isRecording ? 'Stop and transcribe' : 'Start voice input'}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            cursor: disabled || isBusy ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, position: 'relative',
            background: isRecording ? 'rgba(207,63,77,0.12)' : 'rgba(45,88,189,0.08)',
            border: `1.5px solid ${isRecording ? 'var(--color-error)' : 'var(--color-primary)'}`,
            color: isRecording ? 'var(--color-error)' : 'var(--color-primary)',
            transform: isRecording ? `scale(${pulseScale})` : 'scale(1)',
            transition: 'transform 0.1s ease, background 0.2s',
            opacity: isBusy ? 0.55 : 1,
          }}
        >
          {isRecording && (
            <span style={{
              position: 'absolute', inset: -6, borderRadius: '50%',
              border: '1.5px solid var(--color-error)', opacity: 0.35,
              animation: 'vr-ring 1.3s ease-out infinite', pointerEvents: 'none',
            }} />
          )}
          <span className="material-symbols-outlined" style={{ fontSize: 22, animation: isBusy ? 'vr-spin 1s linear infinite' : 'none' }}>
            {isBusy ? 'sync' : isRecording ? 'stop' : 'mic'}
          </span>
        </button>

        <div style={{ flex: 1 }}>
          <span className="text-label" style={{
            display: 'block', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: isRecording ? 'var(--color-error)' : isBusy ? 'var(--color-warning)' : 'var(--color-primary)',
          }}>
            {state === 'idle' && 'Voice input'}
            {state === 'recording' && `Recording ${fmt(elapsed)}`}
            {state === 'transcribing' && 'Transcribing…'}
          </span>
          <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 10 }}>
            {isRecording ? 'Click stop when done' : isBusy ? 'Sending to Spitch…' : 'Speak your tasks, then click stop'}
          </span>
        </div>

        {isRecording && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 22 }}>
            {[0.15, 0.35, 0.6, 0.45, 0.25].map((t, i) => (
              <div key={i} style={{
                width: 3, borderRadius: 2,
                background: volume > t ? 'var(--color-error)' : 'rgba(207,63,77,0.18)',
                height: `${[55,75,100,80,60][i]}%`, transition: 'background 0.08s',
              }} />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          borderRadius: 8, background: 'var(--color-error-soft)',
          border: '1px solid rgba(207,63,77,0.22)',
        }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-error)', fontSize: 16 }}>error</span>
          <span className="text-mono" style={{ color: 'var(--color-error)', fontSize: 11, flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: 0, display: 'flex' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes vr-ring { 0%{transform:scale(1);opacity:.45} 100%{transform:scale(1.65);opacity:0} }
        @keyframes vr-spin { 100%{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
