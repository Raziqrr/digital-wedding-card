import { useEffect, useId, useRef, useState } from 'react'
import { motion, useMotionTemplate, useScroll, useTransform } from 'motion/react'

/* small helpers ---------------------------------------------------------- */
export const haptic = (pattern = 8) => {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* not supported (iOS Safari) — the visual feedback is still there */
  }
}

// "calm" is the visitor's own switch for quiet pages (elders, low-end phones); it counts like reduced motion
export const calmOn = () => typeof document !== 'undefined' && document.documentElement.hasAttribute('data-calm')
export const prefersReduced = () => (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) || calmOn()

/* ---------- a sun that rides the progress bar: pagi -> tengah hari -> senja -> malam ---------- */
const SKY = ['#f0a67e', '#ffd45a', '#f2905a', '#f1dc9f']

export function SkyProgress() {
  const { scrollYProgress } = useScroll()
  const left = useTransform(scrollYProgress, (v) => `calc(8px + ${v} * (100% - 16px))`)
  const color = useTransform(scrollYProgress, [0, 0.35, 0.72, 1], SKY)
  const glow = useMotionTemplate`0 0 0 2px rgba(255,255,255,0.62), 0 0 12px 3px ${color}`
  return (
    <div className="sky" aria-hidden="true">
      <motion.div className="sky-fill" style={{ scaleX: scrollYProgress }} />
      <motion.span className="sky-sun" style={{ left, backgroundColor: color, boxShadow: glow }} />
    </div>
  )
}

/* ---------- lampu kelip: the string lights of a kenduri ---------- */
const SWAGS = 6
const SW = 160
const SAG = 26
const TOP = 6
const VBW = SWAGS * SW
const VBH = 70
const HOOKS = Array.from({ length: SWAGS + 1 }, (_, s) => s * SW)
const WIRE = `M0 ${TOP}` + Array.from({ length: SWAGS }, (_, s) => ` Q${s * SW + SW / 2} ${TOP + 2 * SAG} ${(s + 1) * SW} ${TOP}`).join('')
const BULBS = []
for (let s = 0; s < SWAGS; s++) {
  for (const t of [0.2, 0.5, 0.8]) {
    BULBS.push({ x: s * SW + t * SW, y: TOP + 4 * SAG * t * (1 - t), tone: BULBS.length % 3 === 1 ? 'ivory' : 'gold' })
  }
}

export function StringLights({ className = '', tone = 'day', lit }) {
  const root = useRef(null)
  const gid = useId().replace(/:/g, '')
  const [seen, setSeen] = useState(false)
  const on = lit ?? seen

  useEffect(() => {
    const el = root.current
    if (!el) return undefined
    const bulbs = [...el.querySelectorAll('.bulb')]
    let visible = false
    let raf = 0
    let px = -1e4
    let py = -1e4

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        el.toggleAttribute('data-off', !visible)
        if (visible) setSeen(true)
      },
      { rootMargin: '80px' },
    )
    io.observe(el)

    // bulbs near the pointer flare up (mouse only; touch gets a tap swing instead)
    const apply = () => {
      raf = 0
      const heat = bulbs.map((b) => {
        const r = b.getBoundingClientRect()
        return Math.max(0, 1 - Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2)) / 150)
      })
      bulbs.forEach((b, i) => b.style.setProperty('--hot', heat[i].toFixed(2)))
    }
    const move = (e) => {
      if (!visible || e.pointerType !== 'mouse') return
      px = e.clientX
      py = e.clientY
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const leave = () => {
      px = py = -1e4
      if (!raf) raf = requestAnimationFrame(apply)
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('mouseleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('pointermove', move)
      document.removeEventListener('mouseleave', leave)
    }
  }, [])

  // tap or click a bulb: the whole string swings, then settles
  const kick = (e) => {
    const el = root.current
    if (!el) return
    const bulb = e.target instanceof Element ? e.target.closest('.bulb') : null
    if (bulb) {
      bulb.classList.add('pop')
      setTimeout(() => bulb.classList.remove('pop'), 700)
    }
    if (prefersReduced()) return
    el.toggleAttribute('data-kick', true)
    el.style.setProperty('--amp', '15deg')
    void el.offsetWidth
    el.toggleAttribute('data-kick', false)
    el.style.setProperty('--amp', '3deg')
    haptic(8)
  }

  return (
    <div ref={root} className={`lights ${tone}${on ? ' on' : ''} ${className}`} onClick={kick} aria-hidden="true">
      <svg viewBox={`0 0 ${VBW} ${VBH}`} preserveAspectRatio="xMidYMin slice">
        <defs>
          <radialGradient id={gid}>
            <stop offset="0" stopColor="#ffd978" stopOpacity="0.95" />
            <stop offset="0.4" stopColor="#ffc95a" stopOpacity="0.4" />
            <stop offset="1" stopColor="#ffc95a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path className="wire" d={WIRE} />
        {HOOKS.map((x, k) => (
          <g key={x} className="tassel" style={{ '--i': k + 4 }}>
            <circle className="hook" cx={x} cy={TOP} r="2.4" />
            <g className="pend">
              <path className="t-head" d={`M${x - 2.2} ${TOP + 2} h4.4 v4.5 h-4.4 z`} />
              <path className="t-skirt" d={`M${x - 3.6} ${TOP + 7} h7.2 l1.8 15 h-10.8 z`} />
              <path className="t-lines" d={`M${x - 1.8} ${TOP + 9.5} v11.5 M${x} ${TOP + 9.5} v11.5 M${x + 1.8} ${TOP + 9.5} v11.5`} />
            </g>
          </g>
        ))}
        {BULBS.map((b, i) => (
          <g key={i} className={`bulb ${b.tone}`} style={{ '--i': i }}>
            <circle className="halo" cx={b.x} cy={b.y + 14} r="17" fill={`url(#${gid})`} />
            <circle className="flare" cx={b.x} cy={b.y + 14} r="27" fill={`url(#${gid})`} />
            <g className="pend">
              <line className="cord" x1={b.x} y1={b.y} x2={b.x} y2={b.y + 7} />
              <rect className="cap" x={b.x - 2.6} y={b.y + 6.5} width="5.2" height="4.4" rx="1" />
              <ellipse className="glass" cx={b.x} cy={b.y + 15.5} rx="4.6" ry="6.4" />
            </g>
          </g>
        ))}
      </svg>
    </div>
  )
}

/* ---------- gold dust: drifts up, swirls round the pointer, has depth when you scroll ---------- */
export function Dust({ count = 56 }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    const ctx = cv.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const reduce = prefersReduced()
    let w = 0
    let h = 0
    let raf = 0
    let visible = true
    let px = -1e4
    let py = -1e4
    let lastScroll = window.scrollY

    const resize = () => {
      const r = cv.getBoundingClientRect()
      w = r.width
      h = r.height
      cv.width = w * dpr
      cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const ps = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.7 + Math.random() * 1.9,
      vy: 0.12 + Math.random() * 0.36,
      vx: (Math.random() - 0.5) * 0.16,
      ph: Math.random() * 6.28,
      a: 0.3 + Math.random() * 0.6,
      ox: 0,
      oy: 0,
    }))

    const draw = (ts) => {
      ctx.clearRect(0, 0, w, h)
      for (const p of ps) {
        const near = Math.max(0, 1 - Math.hypot(p.x - px, p.y - py) / 140)
        const tw = 0.45 + 0.55 * Math.sin(ts / 650 + p.ph)
        ctx.globalAlpha = Math.min(1, p.a * tw + near * 0.5)
        ctx.fillStyle = near > 0.15 ? '#e0b24f' : '#c9a049'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * (1 + near * 0.9), 0, 6.283)
        ctx.fill()
      }
    }

    const tick = (ts) => {
      raf = requestAnimationFrame(tick)
      if (!visible || calmOn()) return
      const sy = window.scrollY
      const ds = sy - lastScroll
      lastScroll = sy
      for (const p of ps) {
        const dx = p.x - px
        const dy = p.y - py
        const d = Math.hypot(dx, dy) || 1
        if (d < 130) {
          const f = 1 - d / 130
          p.ox += (dx / d) * f * 0.3 - (dy / d) * f * 0.16
          p.oy += (dy / d) * f * 0.3 + (dx / d) * f * 0.16
        }
        p.ox *= 0.93
        p.oy *= 0.93
        p.y -= p.vy
        p.y += p.oy + ds * (0.35 - p.r * 0.22) // far dust lags the page, near dust leads it
        p.x += p.vx + p.ox + Math.sin(ts / 1600 + p.ph) * 0.12
        if (p.y < -6) {
          p.y = h + 6
          p.x = Math.random() * w
        } else if (p.y > h + 6) {
          p.y = -6
          p.x = Math.random() * w
        }
      }
      draw(ts)
    }

    const move = (e) => {
      if (!visible) return
      const r = cv.getBoundingClientRect()
      px = e.clientX - r.left
      py = e.clientY - r.top
    }
    const away = () => {
      px = py = -1e4
    }
    // a tap scatters the dust around it
    const tap = (e) => {
      if (!visible) return
      const r = cv.getBoundingClientRect()
      const tx = e.clientX - r.left
      const ty = e.clientY - r.top
      for (const p of ps) {
        const dx = p.x - tx
        const dy = p.y - ty
        const d = Math.hypot(dx, dy) || 1
        if (d < 190) {
          const f = 1 - d / 190
          p.ox += (dx / d) * f * 3.2
          p.oy += (dy / d) * f * 3.2
        }
      }
    }

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(cv)
    window.addEventListener('resize', resize)
    if (reduce) {
      draw(0)
    } else {
      raf = requestAnimationFrame(tick)
      window.addEventListener('pointermove', move, { passive: true })
      window.addEventListener('pointerdown', tap, { passive: true })
      document.addEventListener('mouseleave', away)
    }
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', tap)
      document.removeEventListener('mouseleave', away)
    }
  }, [count])
  return <canvas ref={ref} className="gold-dust" aria-hidden="true" />
}

/* ---------- page-wide reactions: spotlight on dark sections, magnetic buttons, petals on tap ---------- */
export function ReactiveLayer() {
  const host = useRef(null)

  useEffect(() => {
    let raf = 0
    let ev = null
    let spotEl = null
    let magEl = null

    const clearMag = () => {
      if (magEl) magEl.style.translate = ''
      magEl = null
    }
    const apply = () => {
      raf = 0
      const e = ev
      if (!e) return
      const t = e.target instanceof Element ? e.target : null
      const spot = t ? t.closest('[data-spot]') : null
      if (spot !== spotEl) {
        spotEl?.classList.remove('spot-on')
        spot?.classList.add('spot-on')
        spotEl = spot
      }
      if (spot) {
        const r = spot.getBoundingClientRect()
        spot.style.setProperty('--mx', `${e.clientX - r.left}px`)
        spot.style.setProperty('--my', `${e.clientY - r.top}px`)
      }
      if (prefersReduced()) return
      const mag = t ? t.closest('.btn, .dock a, .lang-pill, .ctrl') : null
      if (mag !== magEl) {
        clearMag()
        magEl = mag
      }
      if (mag) {
        const r = mag.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2)
        const dy = e.clientY - (r.top + r.height / 2)
        mag.style.translate = `${(dx * 0.18).toFixed(1)}px ${(dy * 0.28).toFixed(1)}px`
      }
    }
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return
      ev = e
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const onLeave = () => {
      ev = null
      spotEl?.classList.remove('spot-on')
      spotEl = null
      clearMag()
    }

    const onClick = (e) => {
      const h = host.current
      if (prefersReduced() || !h || h.childElementCount > 36) return
      const t = e.target instanceof Element ? e.target : null
      if (!t || t.closest('a, button, input, textarea, select, label, [role="radio"], .cover')) return
      for (let k = 0; k < 8; k++) {
        const el = document.createElement('i')
        el.className = 'spark'
        el.style.left = `${e.clientX}px`
        el.style.top = `${e.clientY}px`
        h.appendChild(el)
        const a = Math.random() * Math.PI * 2
        const d = 26 + Math.random() * 40
        const dx = Math.cos(a) * d
        const dy = Math.sin(a) * d + 26
        const rot = (Math.random() - 0.5) * 420
        const run = el.animate(
          [
            { transform: 'translate(-50%,-50%) scale(0.3) rotate(0deg)', opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${rot}deg)`, opacity: 0 },
          ],
          { duration: 750 + Math.random() * 350, easing: 'cubic-bezier(0.2,0.7,0.2,1)' },
        )
        run.onfinish = () => el.remove()
      }
    }

    // the slow rosettes and the woven bands only animate while they are on screen
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.toggleAttribute('data-off', !e.isIntersecting)
      },
      { rootMargin: '120px' },
    )
    document.querySelectorAll('.songket, .star-wrap').forEach((el) => io.observe(el))

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    window.addEventListener('click', onClick)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      clearMag()
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('click', onClick)
    }
  }, [])

  return <div ref={host} className="sparks" aria-hidden="true" />
}
