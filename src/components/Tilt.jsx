import { useRef } from 'react'
import { motion, useReducedMotion, useSpring } from 'motion/react'
import { calmOn } from './Ambient'

/* A card that leans toward the pointer (or the finger while it is pressed) and catches a bit of light. */
export default function Tilt({ className = '', children, max = 7 }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const rx = useSpring(0, { stiffness: 220, damping: 18, mass: 0.6 })
  const ry = useSpring(0, { stiffness: 220, damping: 18, mass: 0.6 })

  const lean = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`)
    el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`)
    el.classList.add('hot')
    if (reduce || calmOn()) return
    ry.set((px - 0.5) * 2 * max)
    rx.set(-(py - 0.5) * 2 * max)
  }
  const rest = () => {
    ref.current?.classList.remove('hot')
    rx.set(0)
    ry.set(0)
  }

  return (
    <motion.div
      ref={ref}
      className={`tilt ${className}`}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={lean}
      onPointerDown={lean}
      onPointerLeave={rest}
      onPointerUp={rest}
      onPointerCancel={rest}
    >
      {children}
    </motion.div>
  )
}
