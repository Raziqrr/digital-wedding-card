import { useMemo, useRef, useState, useEffect } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import { wedding } from '../data'
import { Dust, StringLights } from './Ambient'
import { Corners, Star } from './Ornaments'
import Tirai from './Tirai'

/* ---------- jasmine (bunga melur) line-art that draws itself ---------- */
const STEM = [
  [[24, 412], [70, 312], [110, 252], [168, 166]],
  [[168, 166], [198, 112], [232, 70], [276, 26]],
]

function at(s, t) {
  const [a, b, c, d] = STEM[s]
  const u = 1 - t
  const x = u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0]
  const y = u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]
  const dx = 3 * u * u * (b[0] - a[0]) + 6 * u * t * (c[0] - b[0]) + 3 * t * t * (d[0] - c[0])
  const dy = 3 * u * u * (b[1] - a[1]) + 6 * u * t * (c[1] - b[1]) + 3 * t * t * (d[1] - c[1])
  return { x, y, a: (Math.atan2(dy, dx) * 180) / Math.PI }
}

const LEAF = 'M0 0 C 7 -11 26 -13 40 0 C 26 13 7 11 0 0 Z'
const RIB = 'M2 0 L34 0'
const PETAL = 'M0 0 C -6 -5 -6 -16 0 -21 C 6 -16 6 -5 0 0 Z'

const leaves = []
for (let s = 0; s < 2; s++) {
  for (let i = 1; i <= 6; i++) {
    const t = i / 7
    const p = at(s, t)
    const side = (i + s) % 2 ? 1 : -1
    leaves.push({ ...p, a: p.a + side * 54, k: 0.55 + (1 - (s * 6 + i) / 13) * 0.6 })
  }
}

const flowers = [
  { s: 0, t: 0.38, side: -1, k: 1.25 },
  { s: 0, t: 0.72, side: 1, k: 1.1 },
  { s: 1, t: 0.34, side: -1, k: 1.0 },
  { s: 1, t: 0.7, side: 1, k: 0.85 },
].map((f) => {
  const p = at(f.s, f.t)
  const ang = ((p.a + f.side * 62) * Math.PI) / 180
  return { ...f, x: p.x + Math.cos(ang) * 34, y: p.y + Math.sin(ang) * 34, sx: p.x, sy: p.y }
})

export function Sprig({ className, active }) {
  const draw = (delay, dur = 1.4) => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: active ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 },
    transition: { duration: dur, delay, ease: 'easeInOut' },
  })
  return (
    <svg className={className} viewBox="0 0 300 430" aria-hidden="true">
      <g stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
        <motion.path d={`M${STEM[0][0]} C${STEM[0][1]} ${STEM[0][2]} ${STEM[0][3]} C${STEM[1][1]} ${STEM[1][2]} ${STEM[1][3]}`} {...draw(0.2, 2.6)} />
        {leaves.map((l, i) => (
          <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.a}) scale(${l.k})`}>
            <motion.path d={LEAF} fill="currentColor" fillOpacity="0.18" {...draw(0.5 + i * 0.1, 1.1)} />
            <motion.path d={RIB} strokeWidth="0.9" opacity="0.7" {...draw(0.8 + i * 0.1, 1)} />
          </g>
        ))}
        {flowers.map((f, i) => (
          <g key={i}>
            <motion.path d={`M${f.sx} ${f.sy} L${f.x} ${f.y}`} {...draw(1.0 + i * 0.25, 0.8)} />
            <g transform={`translate(${f.x} ${f.y}) scale(${f.k})`}>
              {[0, 1, 2, 3, 4].map((k) => (
                <g key={k} transform={`rotate(${k * 72})`}>
                  <motion.path d={PETAL} fill="currentColor" fillOpacity="0.24" {...draw(1.6 + i * 0.25 + k * 0.08, 0.9)} />
                </g>
              ))}
              <motion.circle r="2.6" fill="currentColor" stroke="none" initial={{ scale: 0 }} animate={{ scale: active ? 1 : 0 }} transition={{ delay: 2.3 + i * 0.25 }} />
            </g>
          </g>
        ))}
      </g>
    </svg>
  )
}

/* ---------- countdown ---------- */
// ?now=2027-03-20T11:00:00+08:00 pretends it is that moment (to see the wedding-day states)
function useNow() {
  const offset = useMemo(() => {
    const n = Date.parse(new URLSearchParams(window.location.search).get('now') || '')
    return Number.isFinite(n) ? n - Date.now() : 0
  }, [])
  const [now, setNow] = useState(() => Date.now() + offset)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset), 1000)
    return () => clearInterval(id)
  }, [offset])
  return now
}

function split(diff) {
  diff = Math.max(0, diff)
  return {
    days: Math.floor(diff / 864e5),
    hours: Math.floor((diff % 864e5) / 36e5),
    minutes: Math.floor((diff % 36e5) / 6e4),
    seconds: Math.floor((diff % 6e4) / 1e3),
  }
}

// each digit rolls up like an odometer when it changes
function Digit({ ch }) {
  return (
    <span className="digit">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={ch}
          className="digit-face"
          initial={{ y: '70%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-70%', opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {ch}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function Roll({ text }) {
  return (
    <span className="roll" aria-hidden="true">
      {[...text].map((ch, i) => (
        <Digit key={i} ch={ch} />
      ))}
    </span>
  )
}

function Countdown({ t }) {
  const now = useNow()
  const c = split(new Date(wedding.dateISO).getTime() - now)
  const [akad, resepsi] = [wedding.slots.akad, wedding.slots.resepsi].map(([a, b]) => [Date.parse(a), Date.parse(b)])

  // after the reception: a thank-you instead of a clock stuck at zero
  if (now > resepsi[1]) {
    return (
      <p className="day-done" role="status">
        {t.afterDay}
      </p>
    )
  }
  // on the day: what is happening now
  if (now >= akad[0]) {
    const state = ([a, b]) => (now < a ? ['soon', t.stateSoon] : now < b ? ['now', t.stateNow] : ['done', t.stateDone])
    return (
      <div className="day-status" role="status">
        <p className="day-today">{t.today}</p>
        {[
          [t.akad, state(akad)],
          [t.resepsi, state(resepsi)],
        ].map(([name, [k, label]]) => (
          <p key={name} className={`day-row ${k}`}>
            <i aria-hidden="true" />
            <b>{name}</b>
            <span>{label}</span>
          </p>
        ))}
      </div>
    )
  }

  const items = [
    ['days', t.days],
    ['hours', t.hours],
    ['minutes', t.minutes],
    ['seconds', t.seconds],
  ]
  return (
    <div className="countdown" role="timer" aria-label={`${c.days} ${t.days}`}>
      {items.map(([k, label]) => (
        <div className="cd" key={k}>
          <span className="cd-num">
            <Roll text={String(c[k]).padStart(k === 'days' ? 3 : 2, '0')} />
          </span>
          <span className="cd-label">{label}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------- hero ---------- */
const container = { hidden: {}, show: { transition: { staggerChildren: 0.16, delayChildren: 0.25 } } }
const rise = {
  // the camera pushes in through the opened curtain: the text starts a little large and soft
  hidden: { opacity: 0, y: 26, scale: 1.07, filter: 'blur(10px)' },
  show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 1.3, ease: [0.2, 0.7, 0.2, 1] } },
}

export default function Hero({ t, guest, active, tirai }) {
  const { scrollY } = useScroll()
  const yLeft = useTransform(scrollY, [0, 700], [0, -60])
  const yRight = useTransform(scrollY, [0, 700], [0, 70])
  const ySun = useTransform(scrollY, [0, 800], [0, 140])
  const state = active ? 'show' : 'hidden'
  const heroRef = useRef(null)
  const namesRef = useRef(null)

  // mouse: the sun leans away from the pointer and a spot of light follows it across the gold names
  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return
    const hero = heroRef.current
    const names = namesRef.current
    if (!hero || !names) return
    hero.style.setProperty('--hx', (e.clientX / window.innerWidth - 0.5).toFixed(3))
    hero.style.setProperty('--hy', (e.clientY / window.innerHeight - 0.5).toFixed(3))
    names.classList.remove('idle')
    for (const el of names.querySelectorAll('.name')) {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--gx', `${e.clientX - r.left}px`)
      el.style.setProperty('--gy', `${e.clientY - r.top}px`)
      el.style.setProperty('--ga', '1')
    }
  }
  const onLeave = (e) => {
    if (e.pointerType !== 'mouse') return
    const names = namesRef.current
    if (!names) return
    for (const el of names.querySelectorAll('.name')) el.style.setProperty('--ga', '0')
    names.classList.add('idle')
  }
  // touch: a tap sends one thread of light across the names
  const onDown = (e) => {
    if (e.pointerType === 'mouse') return
    const names = namesRef.current
    if (!names) return
    names.classList.remove('idle', 'sweep')
    void names.offsetWidth
    names.classList.add('sweep')
  }
  const onSweepEnd = (e) => {
    if (e.animationName !== 'glint-run') return
    e.currentTarget.classList.remove('sweep')
    e.currentTarget.classList.add('idle')
  }

  return (
    <header className="hero" id="top" ref={heroRef} onPointerMove={onMove} onPointerLeave={onLeave} onPointerDown={onDown}>
      <motion.div className="sun-wrap" style={{ y: ySun }} aria-hidden="true">
        <div className="sun-glow" />
      </motion.div>
      <Star className="hero-star" />
      <div className="hero-frame" aria-hidden="true">
        <Corners />
      </div>
      <Dust />
      <motion.div className="sprig-wrap sprig-tl" style={{ y: yLeft }}>
        <div className="sway">
          <Sprig className="sprig" active={active} />
        </div>
      </motion.div>
      <motion.div className="sprig-wrap sprig-br" style={{ y: yRight }}>
        <div className="sway">
          <Sprig className="sprig" active={active} />
        </div>
      </motion.div>
      <StringLights className="lights-hero" lit={active} />
      {tirai && <Tirai t={t} live={tirai.live} onParted={tirai.onParted} />}

      <motion.div className="hero-inner" variants={container} initial="hidden" animate={state}>
        <motion.p className="eyebrow" variants={rise}>
          {t.greeting}
        </motion.p>
        <motion.p className="hero-dear" variants={rise}>
          {t.dear} <span className="script">{guest}</span>
        </motion.p>

        <h1 className="names idle" ref={namesRef} onAnimationEnd={onSweepEnd} aria-label={`${wedding.bride} & ${wedding.groom}`}>
          <motion.span className="name foil" variants={rise}>
            {wedding.bride}
          </motion.span>
          <motion.span className="amp script" variants={rise}>
            &amp;
          </motion.span>
          <motion.span className="name foil" variants={rise}>
            {wedding.groom}
          </motion.span>
        </h1>

        <motion.p className="hero-line" variants={rise}>
          {t.heroLine}
        </motion.p>

        <motion.div className="date-row" variants={rise}>
          <span className="rule" />
          <p>{t.dateLong}</p>
          <span className="rule" />
        </motion.div>

        <motion.div variants={rise}>
          <Countdown t={t} />
        </motion.div>
      </motion.div>

      <div className="scroll-cue" aria-hidden="true">
        <span />
      </div>
    </header>
  )
}
