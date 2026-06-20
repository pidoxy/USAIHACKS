'use client'

/**
 * KRONOS chrono-kinetic emblem — a tactical chronometer: a glowing bezel ring,
 * cardinal ticks, two hands frozen mid-sweep, and a kinetic "entropy" particle
 * arcing off the dial. Geometry is shared with app/icon.svg and the favicon.
 */
export function LogoMark({ size = 28, glow = true }: { size?: number; glow?: boolean }) {
  const gid = 'kglow'
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <filter id={gid} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.9" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* faint inner ring */}
      <circle cx="24" cy="24" r="14" stroke="#10b981" strokeWidth="1" opacity="0.3" />
      {/* outer bezel */}
      <circle cx="24" cy="24" r="19" stroke="#4edea3" strokeWidth="3" opacity="0.92" filter={glow ? `url(#${gid})` : undefined} />

      {/* cardinal ticks */}
      <g stroke="#4edea3" strokeWidth="1.6" strokeLinecap="round" opacity="0.85">
        <line x1="24" y1="5" x2="24" y2="8.5" />
        <line x1="43" y1="24" x2="39.5" y2="24" />
        <line x1="24" y1="43" x2="24" y2="39.5" />
        <line x1="5" y1="24" x2="8.5" y2="24" />
      </g>

      {/* hands, frozen mid-sweep */}
      <line x1="24" y1="24" x2="30.9" y2="28" stroke="#bdc2ff" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="24" y1="24" x2="30.5" y2="12.7" stroke="#4edea3" strokeWidth="2.2" strokeLinecap="round" />

      {/* hub */}
      <circle cx="24" cy="24" r="2.4" fill="#4edea3" />

      {/* kinetic entropy particle + trail */}
      <circle cx="28.9" cy="5.65" r="1.25" fill="#4edea3" opacity="0.45" />
      <circle cx="33.5" cy="7.55" r="2.4" fill="#4edea3" filter={glow ? `url(#${gid})` : undefined} />
    </svg>
  )
}

export default function Logo({
  size = 26,
  wordmark = true,
  fontSize = 22,
}: {
  size?: number
  wordmark?: boolean
  fontSize?: number
}) {
  return (
    <span className="logo-lockup">
      <LogoMark size={size} />
      {wordmark && (
        <span
          className="text-display logo-wordmark"
          style={{ fontSize }}
        >
          KRONOS
        </span>
      )}
    </span>
  )
}
