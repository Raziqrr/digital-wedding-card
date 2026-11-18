import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { AnimatePresence, MotionConfig, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { copy } from './data'
import { ReactiveLayer, SkyProgress } from './components/Ambient.jsx'
import Cloth from './components/Cloth.jsx'
import Cover from './components/Cover.jsx'
import Hero from './components/Hero.jsx'
import { SongketBand } from './components/Ornaments.jsx'
import Rsvp from './components/Rsvp.jsx'
import { Events, Footer, Gift, Invitation, Moments, Story } from './components/Sections.jsx'

function readParams() {
  const p = new URLSearchParams(window.location.search)
  const to = (p.get('to') || '').trim().slice(0, 60)
  return { to, lang: p.get('lang') === 'en' ? 'en' : 'ms', skip: p.get('skip') === '1', tirai: p.get('tirai') !== '0' }
}

const osReduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

const readFlag = (key, fallback = false) => {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : v === '1'
  } catch {
    return fallback
  }
}
const writeFlag = (key, on) => {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch {
    /* private window: the switch still works for this visit */
  }
}
// phones that report 2 GB of memory or less start in the quiet mode
const lowEnd = () => typeof navigator !== 'undefined' && !!navigator.deviceMemory && navigator.deviceMemory <= 2

function Dock({ t }) {
  const { scrollY } = useScroll()
  const [show, setShow] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => setShow(y > window.innerHeight * 0.6))
  const items = [
    ['#events', t.nav.loc],
    ['#rsvp', t.nav.rsvp],
    ['#gift', t.nav.gift],
  ]
  return (
    <AnimatePresence>
      {show && (
        <motion.nav
          className="dock"
          aria-label="Quick links"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        >
          {items.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </motion.nav>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  const params = useState(readParams)[0]
  const [lang, setLang] = useState(params.lang)
  const [phase, setPhase] = useState(params.skip ? 'page' : 'cover')
  const [coverGone, setCoverGone] = useState(params.skip)
  const [calm, setCalm] = useState(() => readFlag('wc-calm', lowEnd()))
  const [big, setBig] = useState(() => readFlag('wc-big', false))
  // the tirai (curtain) hangs over the hero until it is parted; quiet mode and reduced motion skip it
  const useTirai = params.tirai && !calm && !osReduced()
  const [veil, setVeil] = useState(useTirai)
  const t = copy[lang]
  const guest = params.to || t.defaultGuest

  useEffect(() => {
    document.documentElement.lang = t.htmlLang
  }, [t.htmlLang])

  // the visitor's own switches: quieter page, bigger text
  useEffect(() => {
    document.documentElement.toggleAttribute('data-calm', calm)
    writeFlag('wc-calm', calm)
  }, [calm])
  useEffect(() => {
    document.documentElement.toggleAttribute('data-big', big)
    writeFlag('wc-big', big)
  }, [big])

  useEffect(() => {
    if (!useTirai) setVeil(false)
  }, [useTirai])

  useEffect(() => {
    document.body.classList.toggle('locked', phase === 'cover' || veil)
  }, [phase, veil])
  useEffect(() => {
    if (phase === 'page') window.scrollTo(0, 0)
  }, [phase])

  const parted = useCallback(() => setVeil(false), [])
  const toggleLang = useCallback(() => {
    const swap = () => setLang((l) => (l === 'ms' ? 'en' : 'ms'))
    // a cross-fade between the two languages where the browser can do one
    if (document.startViewTransition && !osReduced() && !document.documentElement.hasAttribute('data-calm')) {
      document.startViewTransition(() => flushSync(swap))
    } else {
      swap()
    }
  }, [])
  const opened = useCallback(() => setPhase('page'), [])
  const gone = useCallback(() => setCoverGone(true), [])
  const active = phase === 'page'

  return (
    <MotionConfig reducedMotion={calm ? 'always' : 'user'}>
      <Cloth active={active && !veil} calm={calm} />
      <SkyProgress />
      <ReactiveLayer />

      <main className="page">
        <Hero t={t} guest={guest} active={active && !veil} tirai={useTirai ? { live: active, onParted: parted } : null} />
        <SongketBand motif="rebung" />
        <Invitation t={t} />
        <SongketBand motif="bintang" />
        <Events t={t} />
        <SongketBand motif="tampuk" />
        <Story t={t} />
        <Moments t={t} />
        <SongketBand motif="tampuk" />
        <Rsvp t={t} guest={guest} hasGuest={!!params.to} />
        <SongketBand motif="bintang" />
        <Gift t={t} />
        <SongketBand motif="rebung" />
        <Footer t={t} />
      </main>

      {active && (
        <>
          <button className="lang-pill" onClick={toggleLang} aria-label="Change language">
            {t.langBtn}
          </button>
          <div className="ctrl-stack">
            <button className="ctrl" aria-pressed={big} aria-label={t.bigAria} onClick={() => setBig((v) => !v)}>
              {t.bigBtn}
            </button>
            <button className="ctrl" aria-pressed={calm} aria-label={t.calmAria} onClick={() => setCalm((v) => !v)}>
              {t.calmBtn}
            </button>
          </div>
          <Dock t={t} />
        </>
      )}

      {!coverGone && <Cover t={t} guest={guest} onOpened={opened} onGone={gone} onLang={toggleLang} />}
    </MotionConfig>
  )
}
