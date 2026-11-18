import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { wedding } from '../data'

// The 3D scene is code-split: the styled cover paints first, the heavy chunk loads after.
const EnvelopeScene = lazy(() => import('./Envelope3D.jsx'))

class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFail?.()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function canWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function Cover({ t, guest, onOpened, onGone, onLang }) {
  // ?flat=1 forces the lightweight 2D cover (same path as no-WebGL / reduced-motion devices)
  const [use3D, setUse3D] = useState(
    () => new URLSearchParams(window.location.search).get('flat') !== '1' && canWebGL() && !prefersReducedMotion(),
  )
  const [ready, setReady] = useState(false)
  const [go, setGo] = useState(false)
  const [wash, setWash] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const pointer = useRef({ x: 0, y: 0 })
  const finished = useRef(false)

  useEffect(() => {
    const move = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    onOpened()
    setLeaving(true)
    setTimeout(onGone, 1000)
  }, [onOpened, onGone])

  const open = () => {
    if (go) return
    setGo(true)
    if (!use3D) {
      setTimeout(() => setWash(true), 450)
      setTimeout(finish, 1250)
    }
  }

  const skip = () => {
    setWash(true)
    setTimeout(finish, 700)
  }

  const canOpen = !use3D || ready
  const labels = { a: wedding.bride[0], b: wedding.groom[0], eyebrow: t.coverEyebrow, dateText: '20 · 03 · 2027' }

  return (
    <div
      className={`cover${wash ? ' washing' : ''}${leaving ? ' leaving' : ''}${go ? ' opening' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t.openAria}
    >
      <div className="cover-glow" />

      {use3D && (
        <div className="cover-canvas">
          <SceneBoundary onFail={() => setUse3D(false)}>
            <Suspense fallback={null}>
              <EnvelopeScene
                go={go}
                pointerRef={pointer}
                labels={labels}
                onReady={() => setReady(true)}
                onWash={() => setWash(true)}
                onDone={finish}
              />
            </Suspense>
          </SceneBoundary>
        </div>
      )}

      {/* flat gold seal: the fallback cover, and a placeholder while the 3D chunk loads */}
      {(!use3D || !ready) && (
        <div className={`cover-flat${use3D ? ' placeholder' : ''}`} aria-hidden="true">
          <div className="flat-seal">
            <span>{wedding.bride[0]}</span>
            <i>&amp;</i>
            <span>{wedding.groom[0]}</span>
          </div>
        </div>
      )}

      <header className="cover-top">
        <p className="eyebrow eyebrow-light">{t.coverEyebrow}</p>
        <p className="cover-for">{t.coverFor}</p>
        <p className="cover-guest script">{guest}</p>
      </header>

      <button className="lang-pill cover-lang" onClick={onLang} aria-label="Change language">
        {t.langBtn}
      </button>

      <footer className="cover-bottom">
        {!go && canOpen && (
          <div className="cta">
            <span className="cta-ring" aria-hidden="true" />
            <span className="cta-text">{t.tapToOpen}</span>
          </div>
        )}
        {!go && !canOpen && <p className="cta-text dim">{t.loading}</p>}
        {go && !wash && (
          <button className="skip" onClick={skip}>
            {t.skip}
          </button>
        )}
      </footer>

      <button className="cover-hit" onClick={open} aria-label={t.openAria} disabled={!canOpen} tabIndex={go ? -1 : 0} />
      <div className="wash" />
    </div>
  )
}
