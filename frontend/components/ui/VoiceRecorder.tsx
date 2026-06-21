'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { ENGINE_ORIGIN } from '@/lib/api/config'

type RecordState = 'idle' | 'connecting' | 'recording' | 'processing'

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
  language?: string
}

const SAMPLE_RATE = 16000   // 16 kHz mono — ideal for speech recognition
const CHUNK_INTERVAL_MS = 5000  // send a WAV chunk to Spitch every 5 s

function wsOrigin() {
  return ENGINE_ORIGIN.replace(/^https/, 'wss').replace(/^http/, 'ws')
}

// Encode Float32 PCM samples → WAV Blob (16-bit mono)
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const numSamples = samples.length
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  function write(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  write(0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)       // PCM
  view.setUint16(22, 1, true)       // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)  // byte rate
  view.setUint16(32, 2, true)       // block align
  view.setUint16(34, 16, true)      // bits per sample
  write(36, 'data')
  view.setUint32(40, numSamples * 2, true)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

export default function VoiceRecorder({ onTranscript, disabled, language = 'en' }: Props) {
  const [state, setState] = useState<RecordState>('idle')
  const [liveText, setLiveText] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const samplesRef = useRef<Float32Array[]>([])
  const animRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finalRef = useRef('')
  const elapsedRef = useRef(0)

  const flushChunk = useCallback((ws: WebSocket, final = false) => {
    if (samplesRef.current.length === 0) return
    const total = samplesRef.current.reduce((s, a) => s + a.length, 0)
    const merged = new Float32Array(total)
    let offset = 0
    for (const chunk of samplesRef.current) {
      merged.set(chunk, offset)
      offset += chunk.length
    }
    samplesRef.current = []

    if (ws.readyState !== WebSocket.OPEN) return
    const wavBlob = encodeWAV(merged, SAMPLE_RATE)
    wavBlob.arrayBuffer().then(buf => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: final ? 'chunk_final' : 'chunk', language }))
        ws.send(buf)
      }
    })
  }, [language])

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    clearInterval(timerRef.current ?? undefined)
    clearInterval(chunkTimerRef.current ?? undefined)
    timerRef.current = null
    chunkTimerRef.current = null
    processorRef.current?.disconnect()
    ctxRef.current?.close().catch(() => null)
    streamRef.current?.getTracks().forEach(t => t.stop())
    processorRef.current = null
    ctxRef.current = null
    streamRef.current = null
    samplesRef.current = []
    setVolume(0)
  }, [])

  const stop = useCallback(() => {
    const ws = wsRef.current
    if (ws) flushChunk(ws, true)
    cleanup()
    if (ws?.readyState === WebSocket.OPEN) {
      setState('processing')
    } else {
      setState('idle')
    }
  }, [cleanup, flushChunk])

  const start = useCallback(async () => {
    setError(null)
    setLiveText('')
    setElapsed(0)
    elapsedRef.current = 0
    finalRef.current = ''
    samplesRef.current = []
    setState('connecting')

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      setError('Microphone access denied. Please allow mic access and try again.')
      setState('idle')
      return
    }
    streamRef.current = stream

    const ws = new WebSocket(`${wsOrigin()}/api/voice/live`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string)
        if (msg.type === 'partial') {
          setLiveText(msg.text)
          finalRef.current = msg.text
        } else if (msg.type === 'final') {
          const text: string = msg.text || finalRef.current
          setLiveText(text)
          if (text) onTranscript(text)
          setState('idle')
          ws.close()
        } else if (msg.type === 'error') {
          setError(msg.message)
        }
      } catch { /* ignore */ }
    }

    ws.onerror = () => {
      cleanup()
      setError('Connection to transcription service failed.')
      setState('idle')
    }

    ws.onopen = () => {
      // Build AudioContext at 16 kHz for speech
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
      ctxRef.current = ctx

      const src = ctx.createMediaStreamSource(stream)
      // ScriptProcessorNode for raw PCM access (deprecated but universal)
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      // Volume analyser
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      src.connect(processor)
      processor.connect(ctx.destination)

      const freqData = new Uint8Array(analyser.frequencyBinCount)
      const tickVolume = () => {
        analyser.getByteFrequencyData(freqData)
        const avg = freqData.reduce((s, v) => s + v, 0) / freqData.length
        setVolume(Math.min(avg / 80, 1))
        animRef.current = requestAnimationFrame(tickVolume)
      }
      animRef.current = requestAnimationFrame(tickVolume)

      // Collect PCM samples
      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0)
        samplesRef.current.push(new Float32Array(data))
      }

      // Send a chunk every CHUNK_INTERVAL_MS
      chunkTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) flushChunk(ws, false)
      }, CHUNK_INTERVAL_MS)

      // Elapsed timer for UI
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1
        setElapsed(elapsedRef.current)
      }, 1000)

      setState('recording')
    }

    ws.onclose = () => {
      if (state !== 'processing') setState('idle')
    }
  }, [cleanup, flushChunk, onTranscript, state])

  useEffect(() => () => { cleanup(); wsRef.current?.close() }, [cleanup])

  const isRecording = state === 'recording'
  const isBusy = state === 'connecting' || state === 'processing'
  const pulseScale = 1 + volume * 0.35

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={isRecording ? stop : start}
          disabled={disabled || isBusy}
          title={isRecording ? 'Stop recording' : 'Start voice input'}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            cursor: disabled || isBusy ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
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
              position: 'absolute',
              inset: -6,
              borderRadius: '50%',
              border: '1.5px solid var(--color-error)',
              opacity: 0.35,
              animation: 'vr-ring 1.3s ease-out infinite',
              pointerEvents: 'none',
            }} />
          )}
          <span className="material-symbols-outlined" style={{ fontSize: 22, animation: isBusy ? 'vr-spin 1s linear infinite' : 'none' }}>
            {isBusy ? 'sync' : isRecording ? 'stop' : 'mic'}
          </span>
        </button>

        <div style={{ flex: 1 }}>
          <span className="text-label" style={{
            display: 'block',
            color: isRecording ? 'var(--color-error)' : isBusy ? 'var(--color-warning)' : 'var(--color-primary)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {state === 'idle' && 'Voice input'}
            {state === 'connecting' && 'Connecting…'}
            {state === 'recording' && `Recording ${fmt(elapsed)}`}
            {state === 'processing' && 'Transcribing…'}
          </span>
          <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 10 }}>
            {isRecording ? 'Click stop when done speaking' : 'Speak your tasks aloud'}
          </span>
        </div>

        {/* Volume bars */}
        {isRecording && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 22 }}>
            {[0.15, 0.35, 0.6, 0.45, 0.25].map((threshold, i) => (
              <div key={i} style={{
                width: 3,
                borderRadius: 2,
                background: volume > threshold ? 'var(--color-error)' : 'rgba(207,63,77,0.18)',
                height: `${[55, 75, 100, 80, 60][i]}%`,
                transition: 'background 0.08s',
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Live transcript bubble */}
      {(liveText || state === 'processing') && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 10,
          background: 'rgba(45,88,189,0.04)',
          border: '1px solid rgba(45,88,189,0.14)',
          fontSize: 13,
          lineHeight: 1.55,
          color: 'var(--color-on-surface)',
          minHeight: 44,
        }}>
          {!liveText && state === 'processing' && (
            <span className="text-mono" style={{ color: 'var(--color-on-muted)', fontSize: 11 }}>Finalising transcript…</span>
          )}
          {liveText && (
            <>
              <span style={{ display: 'block', color: 'var(--color-primary)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                Live transcript
              </span>
              {liveText}
              {isRecording && (
                <span style={{
                  display: 'inline-block', width: 6, height: 14,
                  background: 'var(--color-primary)', marginLeft: 3,
                  verticalAlign: 'middle', animation: 'vr-cursor 1s step-end infinite',
                }} />
              )}
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 8,
          background: 'var(--color-error-soft)',
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
        @keyframes vr-ring   { 0% { transform:scale(1);opacity:.45 } 100% { transform:scale(1.65);opacity:0 } }
        @keyframes vr-spin   { 100% { transform:rotate(360deg) } }
        @keyframes vr-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  )
}
