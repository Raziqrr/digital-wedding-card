import { useId } from 'react'

/* ============================================================
   Songket kit. The page is a bolt of kain songket: the ground is
   cloth, sections are joined by woven bands, panels have the
   gold borders of a pelamin. Three real motifs:
   pucuk rebung (bamboo shoot), bunga bintang (star), tampuk manggis
   (mangosteen calyx).
   ============================================================ */
const GOLD = '#d9b56a'
const DEEP = '#c19a49'
const PALE = '#f1dc9f'

const MOTIFS = {
  rebung: {
    w: 40,
    h: 30,
    tile: (
      <>
        <path d="M2 30 L20 2 L38 30 Z" fill="none" stroke={GOLD} strokeWidth="1.3" />
        <path d="M9 30 L20 12 L31 30 Z" fill={DEEP} />
        <path d="M15 30 L20 21 L25 30 Z" fill={PALE} />
        <circle cx="20" cy="2.2" r="1.5" fill={PALE} />
      </>
    ),
  },
  bintang: {
    w: 36,
    h: 34,
    tile: (
      <>
        <path d="M18 1.5 L34.5 17 L18 32.5 L1.5 17 Z" fill="none" stroke={GOLD} strokeWidth="1.2" />
        <rect x="12" y="11" width="12" height="12" fill={DEEP} />
        <rect x="12" y="11" width="12" height="12" fill={DEEP} transform="rotate(45 18 17)" />
        <circle cx="18" cy="17" r="2.6" fill="#0b4b3d" />
        <circle cx="18" cy="17" r="1.1" fill={PALE} />
      </>
    ),
  },
  tampuk: {
    w: 44,
    h: 34,
    tile: (
      <>
        {Array.from({ length: 8 }, (_, k) => (
          <ellipse key={k} cx="22" cy="8.4" rx="2.9" ry="6.2" fill={k % 2 ? GOLD : DEEP} transform={`rotate(${k * 45} 22 17)`} />
        ))}
        <circle cx="22" cy="17" r="4.4" fill="#0b4b3d" />
        <circle cx="22" cy="17" r="2.4" fill={PALE} />
        <path d="M0 17 l3 -3 l3 3 l-3 3 z M38 17 l3 -3 l3 3 l-3 3 z" fill={PALE} opacity="0.8" />
      </>
    ),
  },
}

/* a woven band that joins two sections */
export function SongketBand({ motif = 'rebung', className = '' }) {
  const id = useId().replace(/:/g, '')
  const m = MOTIFS[motif]
  return (
    <div className={`songket ${className}`} aria-hidden="true">
      <svg width="100%" height={m.h}>
        <defs>
          <pattern id={id} x="50%" width={m.w} height={m.h} patternUnits="userSpaceOnUse">
            {m.tile}
          </pattern>
        </defs>
        <rect width="100%" height={m.h} fill={`url(#${id})`} />
      </svg>
    </div>
  )
}

/* gold corner brackets, like the corners of a framed songket panel */
export function Corners({ className = '' }) {
  return (
    <span className={`corners ${className}`} aria-hidden="true">
      {['tl', 'tr', 'bl', 'br'].map((p) => (
        <svg key={p} className={`corner ${p}`} viewBox="0 0 48 48">
          <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M2 42 V10 a8 8 0 0 1 8 -8 H42" />
            <path d="M9 34 V16 a7 7 0 0 1 7 -7 H34" />
          </g>
          <path d="M19 19 l5 5 -5 5 -5 -5 z" fill="currentColor" />
          <circle cx="2" cy="46" r="1.7" fill="currentColor" />
          <circle cx="46" cy="2" r="1.7" fill="currentColor" />
        </svg>
      ))}
    </span>
  )
}

/* an eight-pointed rosette, used huge and faint behind text; it turns very slowly */
export function Star({ className = '' }) {
  return (
    <div className={`star-wrap ${className}`} aria-hidden="true">
      <svg className="star-mark" viewBox="0 0 200 200">
        <g fill="none" stroke="currentColor" strokeWidth="0.9">
          {Array.from({ length: 8 }, (_, k) => (
            <path key={k} d="M100 6 C108 20 108 32 100 46 C92 32 92 20 100 6 Z" transform={`rotate(${k * 45} 100 100)`} />
          ))}
          <rect x="46" y="46" width="108" height="108" />
          <rect x="46" y="46" width="108" height="108" transform="rotate(45 100 100)" />
          <circle cx="100" cy="100" r="70" />
          <circle cx="100" cy="100" r="60" strokeDasharray="1.5 4" />
          <rect x="72" y="72" width="56" height="56" />
          <rect x="72" y="72" width="56" height="56" transform="rotate(45 100 100)" />
          <circle cx="100" cy="100" r="12" />
          <circle cx="100" cy="100" r="3" fill="currentColor" />
        </g>
      </svg>
    </div>
  )
}
