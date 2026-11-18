import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { sampleWishes } from '../data'
import { pair, rime } from '../pantun'
import { haptic } from './Ambient'
import { Corners, Star } from './Ornaments'
import { Ornament, Reveal } from './Sections'

/* a plastic kenduri chair: one appears for every guest you add */
function Chair() {
  return (
    <motion.svg
      className="chair"
      viewBox="0 0 40 52"
      aria-hidden="true"
      layout
      initial={{ y: -26, opacity: 0, rotate: -14, scale: 0.6 }}
      animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
      exit={{ y: 8, opacity: 0, scale: 0.5 }}
      transition={{ type: 'spring', stiffness: 380, damping: 16 }}
    >
      <path className="back" d="M9 3 h22 a3 3 0 0 1 3 3 v18 h-28 v-18 a3 3 0 0 1 3 -3 z" />
      <path className="slot" d="M14 8 v11 M20 8 v11 M26 8 v11" />
      <path className="seat" d="M4 24 h32 l2 8 h-36 z" />
      <path className="leg" d="M8 32 l-3 18 M14 32 l-1 18 M26 32 l1 18 M32 32 l3 18" />
    </motion.svg>
  )
}

function Check() {
  return (
    <svg className="check" viewBox="0 0 80 80" aria-hidden="true">
      <motion.circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="2.4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeInOut' }} />
      <motion.path d="M24 41 l11 11 22 -24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.7, ease: 'easeOut' }} />
    </svg>
  )
}

function Petals() {
  // a short burst of gold petals when the RSVP is sent
  const items = Array.from({ length: 22 }, (_, i) => i)
  return (
    <div className="petals" aria-hidden="true">
      {items.map((i) => {
        const a = (i / items.length) * Math.PI * 2
        const d = 90 + ((i * 37) % 80)
        return (
          <motion.i
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d + 70, opacity: 0, scale: 1, rotate: 200 + i * 20 }}
            transition={{ duration: 1.6 + (i % 5) * 0.12, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}

export default function Rsvp({ t, guest, hasGuest }) {
  const [name, setName] = useState(hasGuest ? guest : '')
  const [attending, setAttending] = useState(true)
  const [pax, setPax] = useState(2)
  const [wish, setWish] = useState('')
  const [mode, setMode] = useState('plain')
  const [lines, setLines] = useState(['', '', '', ''])
  const [sent, setSent] = useState(false)
  const [wishes, setWishes] = useState(sampleWishes)


  const setLine = (i, v) => setLines((ls) => ls.map((l, k) => (k === i ? v : l)))
  const p13 = pair(lines[0], lines[2])
  const p24 = pair(lines[1], lines[3])
  const chip = (p) => (p.state === 'match' ? `-${p.ra} ✓` : p.state === 'miss' ? `-${p.ra} ≠ -${p.rb}` : '…')

  const submit = (e) => {
    e.preventDefault()
    const text = (mode === 'plain' ? wish : lines.map((l) => l.trim()).filter(Boolean).join('\n')).trim()
    if (text) setWishes((w) => [{ name: name.trim() || guest, text }, ...w])
    setSent(true)
    haptic([12, 50, 12])
  }

  const step = (d) => {
    setPax((p) => Math.min(6, Math.max(1, p + d)))
    haptic(6)
  }

  return (
    <section className="sec rsvp" id="rsvp" data-spot>
      <Star className="rsvp-star" />
      <div className="wrap">
        <Reveal className="sec-head">
          <Ornament light />
          <h2 className="sec-title foil-light">{t.rsvpTitle}</h2>
          <p className="rsvp-intro">{t.rsvpIntro}</p>
        </Reveal>

        <Reveal className="rsvp-card" delay={0.1}>
          <Corners />
          <AnimatePresence mode="wait" initial={false}>
            {!sent ? (
              <motion.form key="form" onSubmit={submit} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                <label className="field">
                  <span>{t.name}</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={guest} autoComplete="name" required />
                </label>

                <div className="seg" role="radiogroup" aria-label={t.rsvpTitle}>
                  <button type="button" role="radio" aria-checked={attending} className={attending ? 'on' : ''} onClick={() => setAttending(true)}>
                    {t.attending}
                  </button>
                  <button type="button" role="radio" aria-checked={!attending} className={!attending ? 'on' : ''} onClick={() => setAttending(false)}>
                    {t.declining}
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {attending && (
                    <motion.div
                      className="field"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <span>{t.pax}</span>
                      <div className="stepper">
                        <button type="button" onClick={() => step(-1)} aria-label="−">
                          −
                        </button>
                        <output aria-live="polite">{pax}</output>
                        <button type="button" onClick={() => step(1)} aria-label="+">
                          +
                        </button>
                      </div>
                      <div className="chairs" aria-hidden="true">
                        <AnimatePresence initial={false}>
                          {Array.from({ length: pax }, (_, i) => (
                            <Chair key={i} />
                          ))}
                        </AnimatePresence>
                      </div>
                      <p className="chairs-note">{t.chairs(pax)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="field">
                  <span>{t.wish}</span>
                  <div className="seg seg-small" role="radiogroup" aria-label={t.wish}>
                    <button type="button" role="radio" aria-checked={mode === 'plain'} className={mode === 'plain' ? 'on' : ''} onClick={() => setMode('plain')}>
                      {t.wishPlain}
                    </button>
                    <button type="button" role="radio" aria-checked={mode === 'pantun'} className={mode === 'pantun' ? 'on' : ''} onClick={() => setMode('pantun')}>
                      {t.wishPantun}
                    </button>
                  </div>
                  {mode === 'plain' ? (
                    <textarea rows="3" value={wish} onChange={(e) => setWish(e.target.value)} placeholder={t.wishPh} aria-label={t.wish} />
                  ) : (
                    <div className="pantun-box">
                      <blockquote className="pantun-couple" lang="ms">
                        <cite>{t.pantunTitle}</cite>
                        {t.pantun.map((l) => (
                          <span key={l}>{l}</span>
                        ))}
                        {t.pantunMean && <small lang="en">{t.pantunMean}</small>}
                      </blockquote>
                      <p className="pantun-help">{t.pantunHelp}</p>
                      {lines.map((l, i) => (
                        <label key={i} className="pantun-line">
                          <input value={l} onChange={(e) => setLine(i, e.target.value)} placeholder={t.pantunLine(i + 1)} aria-label={t.pantunLine(i + 1)} autoComplete="off" />
                          <em aria-hidden="true">{rime(l) ? `-${rime(l)}` : ''}</em>
                        </label>
                      ))}
                      <p className="pantun-meter" role="status">
                        <span className={`rhyme ${p13.state}`}>1 &amp; 3 · {chip(p13)}</span>
                        <span className={`rhyme ${p24.state}`}>2 &amp; 4 · {chip(p24)}</span>
                      </p>
                    </div>
                  )}
                </div>

                <button className="btn btn-gold btn-wide" type="submit">
                  {t.send}
                </button>
              </motion.form>
            ) : (
              <motion.div key="done" className="rsvp-done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                <Petals />
                <Check />
                <h3>{t.thanks}, {name.trim() || guest}!</h3>
                <p>{attending ? t.thanksBody : t.thanksNo}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Reveal>

        <Reveal className="wishes" delay={0.1}>
          <h3 className="wishes-title">{t.wishesTitle}</h3>
          <ul>
            <AnimatePresence initial={false}>
              {wishes.map((w, i) => (
                <motion.li key={`${w.name}-${w.text}-${i}`} layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                  <b>{w.name}</b>
                  <span className={w.text.includes('\n') ? 'is-pantun' : undefined}>{w.text}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
