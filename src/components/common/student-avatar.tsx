const SKIN = ["#f1c7a5", "#d9a47c", "#b97c55", "#8d5a3b", "#e8b896", "#c68e68"]
const HAIR = ["#1f1f1f", "#3b2414", "#5a3a22", "#111827", "#2d1b0e", "#4a2c17"]
const SHIRT = ["#16a34a", "#f5f5f5", "#0f172a", "#22c55e", "#e5e7eb", "#14532d"]

/** Illustrated student bust used in the demo classroom. Deterministic per `seed`. */
export function StudentAvatar({ seed, className }: { seed: number; className?: string }) {
  const skin = SKIN[seed % SKIN.length]
  const hair = HAIR[(seed * 7) % HAIR.length]
  const shirt = SHIRT[(seed * 5) % SHIRT.length]
  const style = seed % 4

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M8 64c0-13 10.5-21 24-21s24 8 24 21z" fill={shirt} stroke="#0002" strokeWidth=".5" />
      <rect x="27" y="36" width="10" height="9" rx="3" fill={skin} />
      {style === 1 && <path d="M15 30c0-14 7-21 17-21s17 7 17 21v12c-3 0-4-2-4-6V26H19v10c0 4-1 6-4 6z" fill={hair} />}
      <circle cx="32" cy="27" r="13" fill={skin} />
      {style === 0 && <path d="M19 25c0-9 6-14 13-14s13 5 13 14c-4-4-9-6-13-6s-9 2-13 6z" fill={hair} />}
      {style === 1 && <path d="M19 24c1-8 6-12 13-12s12 4 13 12c-6-2-10-5-12-8-2 4-8 7-14 8z" fill={hair} />}
      {style === 2 && (
        <>
          <path d="M19 26c-1-10 5-16 13-16s14 6 13 16c-3-5-8-7-13-7s-10 2-13 7z" fill={hair} />
          <circle cx="32" cy="10" r="5" fill={hair} />
        </>
      )}
      {style === 3 && <path d="M18 27c0-11 6-16 14-16 9 0 14 6 14 14l-3-3c-6 0-12-2-15-5-2 4-6 7-10 10z" fill={hair} />}
      <circle cx="27" cy="28" r="1.6" fill="#1f1f1f" />
      <circle cx="37" cy="28" r="1.6" fill="#1f1f1f" />
      <path d="M28 33c2 2 6 2 8 0" fill="none" stroke="#1f1f1f" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
