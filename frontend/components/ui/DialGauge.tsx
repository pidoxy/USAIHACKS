'use client'

interface DialGaugeProps {
  value: number
  max?: number
  label: string
  sublabel: string
  unit?: string
  variant?: 'primary' | 'secondary' | 'error'
  size?: number
}

export default function DialGauge({
  value,
  max = 100,
  label,
  sublabel,
  unit = '%',
  variant = 'primary',
  size = 160,
}: DialGaugeProps) {
  const radius = 64
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / max, 1)

  const colors: Record<string, string> = {
    primary:   '#4edea3',
    secondary: '#bdc2ff',
    error:     '#ff778a',
  }
  const c = colors[variant]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}` }} className={variant === 'primary' ? 'pulse' : ''} />
        <span className="text-label" style={{ color: c, fontSize: 10 }}>{label}</span>
      </div>

      <div style={{ position: 'relative', width: size, height: size, marginTop: 32 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-126deg)' }}>
          <circle
            className="dial-track"
            cx={size / 2} cy={size / 2} r={radius}
            strokeDasharray={`${circumference * 0.8} ${circumference * 0.2}`}
          />
          <circle
            className={`dial-${variant}`}
            cx={size / 2} cy={size / 2} r={radius}
            strokeDasharray={`${circumference * 0.8} ${circumference * 0.2}`}
            strokeDashoffset={circumference * 0.8 - circumference * 0.8 * pct}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="text-metric" style={{ color: 'var(--color-on-surface)' }}>
            {value}<span style={{ fontSize: 16, color: 'var(--color-on-muted)' }}>{unit}</span>
          </span>
          <span className="text-label" style={{ fontSize: 9, color: c, marginTop: 4 }}>{sublabel}</span>
        </div>
      </div>
    </div>
  )
}
