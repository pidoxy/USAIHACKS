'use client'

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="44" height="44" rx="16" fill="#E8F0FF" />
      <circle cx="24" cy="24" r="12.5" fill="#2D58BD" />
      <circle cx="24" cy="24" r="8.5" stroke="white" strokeWidth="2.5" opacity="0.92" />
      <path d="M24 18.5V24L28 26.6" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="35.5" cy="13.5" r="4.5" fill="#8FDCC2" />
    </svg>
  )
}

export default function Logo({
  size = 28,
  wordmark = true,
  fontSize = 20,
}: {
  size?: number
  wordmark?: boolean
  fontSize?: number
}) {
  return (
    <span className="logo-lockup">
      <LogoMark size={size} />
      {wordmark ? (
        <span className="text-display logo-wordmark" style={{ fontSize }}>
          Kronos
        </span>
      ) : null}
    </span>
  )
}
