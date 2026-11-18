import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { wedding } from '../data'
import { Dust, StringLights, haptic } from './Ambient'
import { Sprig } from './Hero'
import { Corners, SongketBand, Star } from './Ornaments'
import Tilt from './Tilt'

export function Reveal({ children, delay = 0, y = 30, className }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, scale: 1.035, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.9, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function Ornament({ light }) {
  return (
    <svg className={`ornament${light ? ' ornament-light' : ''}`} viewBox="0 0 260 28" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 14 H98" />
        <path d="M162 14 H254" />
        <path d="M130 2 L146 14 L130 26 L114 14 Z" />
        <path d="M130 8 L138 14 L130 20 L122 14 Z" fill="currentColor" />
        <circle cx="104" cy="14" r="1.7" fill="currentColor" />
        <circle cx="156" cy="14" r="1.7" fill="currentColor" />
        {[22, 38, 54, 70, 86].map((x) => (
          <path key={x} d={`M${x - 4} 14 L${x} 6 L${x + 4} 14`} />
        ))}
        {[174, 190, 206, 222, 238].map((x) => (
          <path key={x} d={`M${x - 4} 14 L${x} 6 L${x + 4} 14`} />
        ))}
      </g>
    </svg>
  )
}

function SectionHead({ eyebrow, title, light }) {
  return (
    <Reveal className="sec-head">
      <Ornament light={light} />
      {eyebrow && <p className={`eyebrow${light ? ' eyebrow-light' : ''}`}>{eyebrow}</p>}
      <h2 className={`sec-title${light ? ' foil-light' : ''}`}>{title}</h2>
    </Reveal>
  )
}

/* ---------- invitation ---------- */
export function Invitation({ t }) {
  return (
    <section className="sec invitation" id="invitation">
      <Star className="inv-star" />
      <Dust count={26} />
      <div className="wrap narrow">
        <div className="frame-card">
          <SectionHead title={t.invTitle} />
          <Reveal delay={0.1}>
            <p className="inv-body">{t.invBody(wedding)}</p>
          </Reveal>
          <div className="couple">
            <Reveal className="person" delay={0.1}>
              <div className="monogram">
                <span>{wedding.bride[0]}</span>
              </div>
              <h3>{wedding.brideFull}</h3>
              <p>{t.brideLabel}</p>
            </Reveal>
            <Reveal className="amp-big" delay={0.2}>
              <span className="script foil">&amp;</span>
            </Reveal>
            <Reveal className="person" delay={0.3}>
              <div className="monogram">
                <span>{wedding.groom[0]}</span>
              </div>
              <h3>{wedding.groomFull}</h3>
              <p>{t.groomLabel}</p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- events ---------- */
function downloadICS(t) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Demo Wedding Card//EN',
    'BEGIN:VEVENT',
    'UID:demo-aisyah-irfan@example.invalid',
    'DTSTAMP:20261118T000000Z',
    'DTSTART:20270320T040000Z',
    'DTEND:20270320T080000Z',
    `SUMMARY:${t.resepsi} ${wedding.bride} & ${wedding.groom}`,
    `LOCATION:${wedding.venue}\\, ${wedding.city}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([lines], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'aisyah-irfan.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const RingsIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle className="ring-a" cx="18" cy="26" r="11" />
      <circle className="ring-b" cx="30" cy="26" r="11" />
      <path d="M24 8 l3 4 -3 4 -3 -4 z" fill="currentColor" stroke="none" />
    </g>
  </svg>
)
const StarIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <rect x="11" y="11" width="26" height="26" />
      <rect className="star-r" x="11" y="11" width="26" height="26" />
      <circle cx="24" cy="24" r="4" fill="currentColor" stroke="none" />
    </g>
  </svg>
)

function EventCard({ icon, title, time, note, date, delay }) {
  return (
    <Reveal className="event-slot" delay={delay}>
      <Tilt className="event">
        <Corners />
        <div className="event-icon">{icon}</div>
        <h3>{title}</h3>
        <p className="event-date">{date}</p>
        <p className="event-time">{time}</p>
        <p className="event-note">{note}</p>
      </Tilt>
    </Reveal>
  )
}

export function Events({ t }) {
  const q = encodeURIComponent(wedding.mapQuery)
  return (
    <section className="sec events" id="events" data-spot>
      <StringLights tone="night" className="lights-events" />
      <div className="wrap">
        <SectionHead light eyebrow={t.dateShort} title={t.eventsTitle} />
        <div className="event-grid">
          <EventCard icon={<RingsIcon />} title={t.akad} date={t.dateShort} time={t.akadTime} note={t.akadNote} delay={0.05} />
          <EventCard icon={<StarIcon />} title={t.resepsi} date={t.dateShort} time={t.resepsiTime} note={t.resepsiNote} delay={0.2} />
        </div>

        <Reveal className="venue" delay={0.1}>
          <p className="venue-name">{wedding.venue}</p>
          <p className="venue-city">{wedding.city}</p>
          <p className="venue-note">{t.facilities}</p>
          <div className="btn-row">
            <a className="btn btn-gold" href={`https://waze.com/ul?q=${q}&navigate=yes`} target="_blank" rel="noreferrer">
              {t.waze}
            </a>
            <a className="btn btn-ghost" href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer">
              {t.maps}
            </a>
            <button className="btn btn-ghost" onClick={() => downloadICS(t)}>
              {t.calendar}
            </button>
          </div>
          <div className="dress">
            <span className="dress-label">{t.dress}</span>
            <span className="swatches" aria-hidden="true">
              <i style={{ background: '#0b4b3d' }} />
              <i style={{ background: '#d9b56a' }} />
              <i style={{ background: '#f6f0e2' }} />
            </span>
            <span className="dress-note">{t.dressNote}</span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- story ---------- */
// a jasmine sprig that draws itself when it scrolls into view
function GrowSprig({ className }) {
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, margin: '0px 0px -12% 0px' })
  return (
    <div ref={ref} className={`grow-sprig ${className}`} aria-hidden="true">
      <Sprig className="sprig" active={seen} />
    </div>
  )
}

// the beat that crosses the middle of the screen lights up
function TlItem({ s, side }) {
  const ref = useRef(null)
  const lit = useInView(ref, { margin: '-42% 0px -42% 0px' })
  return (
    <Reveal className={`tl-item ${side}`} delay={0.05}>
      <div ref={ref} className={`tl-inner${lit ? ' lit' : ''}`}>
        <span className="tl-dot" aria-hidden="true" />
        <p className="tl-year">{s.year}</p>
        <h3>{s.title}</h3>
        <p>{s.text}</p>
      </div>
    </Reveal>
  )
}

export function Story({ t }) {
  return (
    <section className="sec story" id="story">
      <GrowSprig className="s-tr" />
      <GrowSprig className="s-bl" />
      <div className="wrap narrow">
        <SectionHead title={t.storyTitle} />
        <div className="timeline">
          <span className="timeline-line" aria-hidden="true" />
          {t.story.map((s, i) => (
            <TlItem key={s.year} s={s} side={i % 2 ? 'right' : 'left'} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- moments: arch frames ---------- */
const SCENES = [
  { name: 'dawn', orb: [120, 150, 26] },
  { name: 'day', orb: [70, 110, 22] },
  { name: 'dusk', orb: [140, 170, 30] },
  { name: 'night', orb: [90, 90, 18] },
  { name: 'blush', orb: [110, 130, 24] },
]
const STARS = [[30, 40], [150, 30], [60, 80], [170, 90], [100, 30], [40, 120], [160, 140]]

export function Moments({ t }) {
  const rail = useRef(null)

  // swiping the row slides each arch's hills at different speeds, so the scenes have depth
  useEffect(() => {
    const el = rail.current
    if (!el) return undefined
    let raf = 0
    const run = () => {
      raf = 0
      const cr = el.getBoundingClientRect()
      const cx = cr.left + cr.width / 2
      for (const f of el.children) {
        const r = f.getBoundingClientRect()
        f.style.setProperty('--sx', ((r.left + r.width / 2 - cx) / cr.width).toFixed(3))
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(run)
    }
    run()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // pointer over an arch nudges the sky and hills the other way
  const look = (e) => {
    if (e.pointerType !== 'mouse') return
    const f = e.currentTarget
    const r = f.getBoundingClientRect()
    f.style.setProperty('--px', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(2))
    f.style.setProperty('--py', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(2))
  }
  const unlook = (e) => {
    e.currentTarget.style.setProperty('--px', '0')
    e.currentTarget.style.setProperty('--py', '0')
  }

  return (
    <section className="sec moments" id="moments">
      <div className="wrap">
        <SectionHead title={t.momentsTitle} />
      </div>
      <div className="stage">
        <SongketBand motif="bintang" className="stage-band" />
        <div className="arches" ref={rail} tabIndex={0} aria-label={t.momentsTitle}>
        {SCENES.map((s, i) => (
          <motion.figure
            key={s.name}
            className={`arch ${s.name}`}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.8, delay: i * 0.08 }}
            onPointerMove={look}
            onPointerLeave={unlook}
          >
            <svg viewBox="0 0 200 280" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              {s.name === 'night' && STARS.map(([x, y], k) => <circle key={k} cx={x} cy={y} r={k % 2 ? 1.2 : 1.8} className="star" style={{ '--k': k }} />)}
              <circle className="orb" cx={s.orb[0]} cy={s.orb[1]} r={s.orb[2]} />
              <path className="hill h1" d="M0 200 C40 170 90 190 130 175 C165 163 185 180 200 172 V280 H0Z" />
              <path className="hill h2" d="M0 225 C50 200 100 230 150 210 C175 200 190 212 200 206 V280 H0Z" />
              <path className="hill h3" d="M0 250 C60 235 110 258 200 238 V280 H0Z" />
            </svg>
            <figcaption>{t.momentsHint}</figcaption>
          </motion.figure>
        ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- e-gift ---------- */
function SampleQR() {
  const cells = useMemo(() => {
    const n = 25
    let seed = 20270320
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    const grid = Array.from({ length: n }, () => Array.from({ length: n }, () => rnd() > 0.52))
    const finder = (ox, oy) => {
      for (let y = -1; y <= 7; y++)
        for (let x = -1; x <= 7; x++) {
          const gx = ox + x
          const gy = oy + y
          if (gx < 0 || gy < 0 || gx >= n || gy >= n) continue
          const edge = x === 0 || x === 6 || y === 0 || y === 6
          const core = x >= 2 && x <= 4 && y >= 2 && y <= 4
          grid[gy][gx] = x >= 0 && x <= 6 && y >= 0 && y <= 6 && (edge || core)
        }
    }
    finder(0, 0)
    finder(n - 7, 0)
    finder(0, n - 7)
    return grid
  }, [])
  return (
    <div className="qr">
      <svg viewBox="0 0 25 25" shapeRendering="crispEdges" aria-hidden="true">
        <rect width="25" height="25" fill="#fff" />
        {cells.map((row, y) => row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#073a30" /> : null)))}
      </svg>
      <span className="qr-sample">
        <b>SAMPLE</b>
      </span>
    </div>
  )
}

export function Gift({ t }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wedding.gift.account.replace(/\s/g, ''))
    } catch {
      /* clipboard may be unavailable; the number is still visible */
    }
    setCopied(true)
    haptic(10)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <section className="sec gift" id="gift">
      <div className="wrap narrow">
        <div className="frame-card">
          <SectionHead title={t.giftTitle} />
          <Reveal delay={0.1}>
            <p className="gift-intro">{t.giftIntro}</p>
            <button className="btn btn-ghost-dark" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
              {open ? t.giftHide : t.giftToggle}
            </button>
          </Reveal>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                className="gift-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <div className="gift-inner">
                  <SampleQR />
                  <p className="qr-note">{t.qrNote}</p>
                  <p className="bank">{wedding.gift.bank}</p>
                  <p className="acct">{wedding.gift.account}</p>
                  <p className="holder">{wedding.gift.holder}</p>
                  <button className="btn btn-gold" onClick={copy}>
                    {copied ? t.copied : t.copy}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

/* ---------- footer ---------- */
/* share the card without the guest's own name in the link */
function Share({ t }) {
  const click = async () => {
    haptic(8)
    const u = new URL(window.location.href)
    ;['to', 'skip', 'now', 'tirai'].forEach((k) => u.searchParams.delete(k))
    const url = u.toString()
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, text: t.shareText, url })
      } catch {
        /* closed without sharing */
      }
      return
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${t.shareText} ${url}`)}`, '_blank', 'noopener')
  }
  return (
    <button type="button" className="btn btn-ghost share-btn" onClick={click}>
      {t.share}
    </button>
  )
}

export function Footer({ t }) {
  return (
    <footer className="footer" data-spot>
      <Star className="foot-star" />
      <StringLights tone="night" className="lights-footer" />
      <Reveal className="wrap narrow">
        <Ornament light />
        <p className="script foot-thanks foil-light">{t.footerThanks}</p>
        <p className="foot-names">
          {wedding.bride} <span>&amp;</span> {wedding.groom}
        </p>
        <p className="foot-date">{t.dateShort}</p>
        <Share t={t} />
        <p className="demo-note">{t.demo}</p>
      </Reveal>
    </footer>
  )
}
