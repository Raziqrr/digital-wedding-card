import { useEffect, useRef, useState } from 'react'
import { MOTIF_GLSL } from './songketGLSL'

/* ============================================================
   Tirai: the pelamin curtain over the hero.
   Two panels of songket-woven cloth. Each panel is a small cloth
   simulation: a mesh of points held to a pleated shape by springs
   (stiff at the rod, loose at the hem), tied together by distance
   constraints, pushed by a breeze, by your finger, by the mouse.
   Drag sideways, or tap, and the panels gather and are tied back.
   They stay at the sides of the hero and answer to a touch.
   If WebGL is missing the card simply opens without it.
   ============================================================ */

const NX = 16 // points across a panel
const NY = 24 // points down
const FOLDS = 5
const PITCH = 3.2 // css px per thread

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const smooth = (x) => x * x * (3 - 2 * x)

const VERT = `#version 300 es
in vec3 aPos;
in vec3 aNrm;
in vec2 aUV;
uniform vec2 uView;
out vec3 vN;
out vec2 vUV;
out vec3 vP;
void main(){
  float persp = 1.0 / (1.0 - aPos.z / (uView.x * 1.8));
  vec2 c = (aPos.xy - uView * 0.5) * persp + uView * 0.5;
  gl_Position = vec4(c.x / uView.x * 2.0 - 1.0, 1.0 - c.y / uView.y * 2.0, -aPos.z / (uView.x * 3.0), 1.0);
  vN = aNrm;
  vUV = aUV;
  vP = vec3(c, aPos.z);
}`

const FRAG = `#version 300 es
precision highp float;
in vec3 vN;
in vec2 vUV;
in vec3 vP;
out vec4 o;
uniform vec2  uView;
uniform vec2  uLight;
uniform vec2  uCells;
uniform float uTime;
uniform float uOpen;
${MOTIF_GLSL}
void main(){
  vec3 N = normalize(vN);
  vec2 cell = floor(vUV * uCells);
  float rnd;
  float m = motifAt(cell, rnd);
  float checker = mod(cell.x + cell.y, 2.0);

  // deep emerald silk, a touch lighter where the weft rides over the warp
  vec3 ground = mix(vec3(0.016, 0.125, 0.098), vec3(0.042, 0.245, 0.192), checker * 0.7 + 0.3 * vnoise(vUV * uCells / 38.0));
  vec3 gold = vec3(0.70, 0.50, 0.16) * (0.9 + 0.2 * rnd);

  // braid down the leading edge, a hem band, and a cord at the tie once the panel is gathered
  float edge = smoothstep(0.972, 0.978, vUV.x);
  float hem = smoothstep(0.945, 0.955, vUV.y);
  float cord = exp(-pow((vUV.y - 0.6) / 0.014, 2.0)) * smoothstep(0.55, 0.9, uOpen);
  float dash = step(0.5, fract(vUV.y * uCells.y / 5.0 + vUV.x * 3.0));
  float trim = max(max(edge, hem), cord);
  float g = max(m, trim);
  vec3 alb = mix(ground, gold * (trim > 0.5 ? 0.82 + 0.18 * dash : 1.0), g);

  // one lamp: pleats catch it, gold answers hardest
  vec3 Lv = vec3(uLight - vP.xy, uView.y * 0.55);
  vec3 L = normalize(Lv);
  float diff = max(dot(N, L), 0.0);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(N, H), 0.0), 26.0);
  float att = 1.0 / (1.0 + pow(length(Lv.xy) / (uView.y * 0.9), 2.0));
  vec3 col = alb * (0.3 + 0.62 * diff * (0.45 + 0.55 * att));
  col += vec3(1.0, 0.88, 0.58) * spec * (0.08 + 0.38 * g) * att;
  float fres = pow(1.0 - clamp(N.z, 0.0, 1.0), 2.0);
  col += vec3(0.9, 0.68, 0.3) * fres * 0.22 * (0.3 + diff);
  col *= mix(0.45, 1.0, smoothstep(0.0, 0.3, vUV.y));   // shadow of the pelmet
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

function compile(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[tirai] shader:', gl.getShaderInfoLog(s))
    gl.deleteShader(s)
    return null
  }
  return s
}

function makePanel(gl, side) {
  const n = NX * NY
  const uv = new Float32Array(n * 2)
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      uv[(j * NX + i) * 2] = i / (NX - 1)
      uv[(j * NX + i) * 2 + 1] = j / (NY - 1)
    }
  }
  const idx = []
  for (let j = 0; j < NY - 1; j++) {
    for (let i = 0; i < NX - 1; i++) {
      const a = j * NX + i
      idx.push(a, a + NX, a + 1, a + 1, a + NX, a + NX + 1)
    }
  }
  const mk = (data, usage) => {
    const b = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, data, usage)
    return b
  }
  const p = {
    side,
    pos: new Float32Array(n * 3),
    prev: new Float32Array(n * 3),
    tgt: new Float32Array(n * 3),
    nrm: new Float32Array(n * 3),
    ready: false,
    vao: gl.createVertexArray(),
    posBuf: null,
    nrmBuf: null,
    uvBuf: null,
    ibo: gl.createBuffer(),
    count: idx.length,
  }
  p.posBuf = mk(p.pos, gl.DYNAMIC_DRAW)
  p.nrmBuf = mk(p.nrm, gl.DYNAMIC_DRAW)
  p.uvBuf = mk(uv, gl.STATIC_DRAW)
  gl.bindVertexArray(p.vao)
  const bind = (buf, loc, size) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
  }
  return { p, bind, idx }
}

function start(canvas, ctl) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, depth: true, premultipliedAlpha: true, powerPreference: 'low-power' })
  if (!gl) return null
  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null
  const prog = gl.createProgram()
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[tirai] link:', gl.getProgramInfoLog(prog))
    return null
  }
  gl.useProgram(prog)
  const U = {}
  for (const n of ['uView', 'uLight', 'uCells', 'uTime', 'uOpen']) U[n] = gl.getUniformLocation(prog, n)
  const aPos = gl.getAttribLocation(prog, 'aPos')
  const aNrm = gl.getAttribLocation(prog, 'aNrm')
  const aUV = gl.getAttribLocation(prog, 'aUV')

  const panels = [-1, 1].map((side) => {
    const { p, bind, idx } = makePanel(gl, side)
    bind(p.posBuf, aPos, 3)
    bind(p.nrmBuf, aNrm, 3)
    bind(p.uvBuf, aUV, 2)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.ibo)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW)
    gl.bindVertexArray(null)
    return p
  })

  let W = 0
  let H = 0
  let leave = 0 // 0..1: the panels slide off once the guest has seen them tied back
  let settled = 0
  let dpr = 1
  const resize = () => {
    const r = canvas.getBoundingClientRect()
    W = Math.max(2, r.width)
    H = Math.max(2, r.height)
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    gl.viewport(0, 0, canvas.width, canvas.height)
    panels.forEach((p) => (p.ready = false))
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  // where each point wants to be, for how open the panel is (e: 0 closed, 1 tied back)
  const shape = (p, e) => {
    const ov = W * 0.03
    const closedW = W * 0.5 + ov
    for (let j = 0; j < NY; j++) {
      const v = j / (NY - 1)
      const pinch = Math.exp(-(((v - 0.6) / 0.09) ** 2))
      const tiedW = W * (0.125 - 0.06 * pinch + 0.05 * smooth(clamp((v - 0.6) / 0.4, 0, 1)))
      for (let i = 0; i < NX; i++) {
        const u = i / (NX - 1)
        const eu = smooth(clamp(e * 1.45 - (1 - u) * 0.45, 0, 1)) // the leading edge goes first
        const xl = u * (closedW + (tiedW - closedW) * eu)
        const amp = W * (0.011 + 0.05 * eu) * (1 - 0.55 * pinch)
        const z = amp * Math.sin(u * Math.PI * 2 * FOLDS + v * 0.7) + (p.side > 0 ? W * 0.012 : 0)
        const k = (j * NX + i) * 3
        const away = leave * leave * W * 0.32
        p.tgt[k] = p.side < 0 ? xl - away : W - xl + away
        p.tgt[k + 1] = v * (H + 16) - 8
        p.tgt[k + 2] = z
      }
    }
  }

  /* ---------- state ---------- */
  let e = 0
  let eT = 0
  let rate = 3
  let autoAt = Infinity
  let firedParted = false
  let drag = null
  let t = 0
  let last = performance.now()
  let raf = 0
  let visible = true
  let dead = false
  const ptr = { x: -999, y: -999, vx: 0, vy: 0, on: false, pressed: false }
  const light = { x: 0, y: 0 }

  ctl.open = () => {
    ctl.engage?.()
    autoAt = -1
    eT = 1
    rate = 3.2
  }

  const rel = (ev) => {
    const r = canvas.getBoundingClientRect()
    return { x: ev.clientX - r.left, y: ev.clientY - r.top, w: r.width }
  }
  const setPtr = (x, y) => {
    ptr.vx = clamp(x - ptr.x, -40, 40)
    ptr.vy = clamp(y - ptr.y, -40, 40)
    ptr.x = x
    ptr.y = y
    ptr.on = true
  }
  const onDown = (ev) => {
    if (ctl.parted()) return
    try {
      canvas.setPointerCapture(ev.pointerId)
    } catch {
      /* a synthetic pointer: nothing to capture */
    }
    const q = rel(ev)
    ctl.engage?.()
    drag = { x0: ev.clientX, y0: ev.clientY, moved: 0 }
    ptr.x = q.x
    ptr.y = q.y
    ptr.pressed = true
    setPtr(q.x, q.y)
    autoAt = Infinity
  }
  const onMove = (ev) => {
    const q = rel(ev)
    if (ev.pointerType === 'mouse' || drag) setPtr(q.x, q.y)
    if (!drag) return
    const dx = Math.abs(ev.clientX - drag.x0)
    drag.moved = Math.max(drag.moved, dx + Math.abs(ev.clientY - drag.y0))
    eT = clamp(dx / (q.w * 0.3), 0, 1)
    rate = 14
  }
  const onUp = () => {
    ptr.pressed = false
    if (!drag) return
    const tap = drag.moved < 10
    eT = tap || eT > 0.3 ? 1 : 0
    rate = tap ? 3.2 : 5
    drag = null
  }
  const onLeave = () => {
    if (!drag) ptr.on = false
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  canvas.addEventListener('pointerleave', onLeave)
  // once the panels are tied back the canvas lets touches through, so listen on the window
  const winMove = (ev) => {
    if (!ctl.parted()) return
    const p = ev.touches ? ev.touches[0] : ev
    if (ev.pointerType && ev.pointerType !== 'mouse') return
    const q = rel(p)
    if (q.x < -20 || q.y < -20 || q.y > H + 20 || q.x > W + 20) {
      ptr.on = false
      return
    }
    setPtr(q.x, q.y)
  }
  window.addEventListener('pointermove', winMove, { passive: true })
  window.addEventListener('touchmove', winMove, { passive: true })

  const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting))
  io.observe(canvas)

  /* ---------- simulation ---------- */
  const step = (p, dt, time) => {
    const s = Math.min(2, dt * 60)
    const damp = Math.pow(0.9, s)
    const { pos, prev, tgt } = p
    const R = Math.min(W, H) * 0.2
    const R2 = R * R
    for (let j = 0; j < NY; j++) {
      const v = j / (NY - 1)
      const k = j === 0 ? 1 : 0.02 + 0.2 * Math.pow(1 - v, 1.3)
      const wv = Math.pow(v, 1.5)
      const windX = (Math.sin(time * 0.8 + p.side * 1.3) + 0.6 * Math.sin(time * 1.9 + 2)) * W * 0.0011 * wv
      const windZ = (Math.sin(time * 0.7 + v * 2.4) + 0.5 * Math.sin(time * 1.6 + p.side)) * W * 0.0022 * wv
      for (let i = 0; i < NX; i++) {
        const q = (j * NX + i) * 3
        for (let a = 0; a < 3; a++) {
          const x = pos[q + a]
          pos[q + a] = x + (x - prev[q + a]) * damp + (tgt[q + a] - x) * k * s
          prev[q + a] = x
        }
        if (j === 0) continue
        pos[q] += windX * s
        pos[q + 2] += windZ * s
        if (ptr.on) {
          const dx = pos[q] - ptr.x
          const dy = pos[q + 1] - ptr.y
          const d2 = dx * dx + dy * dy
          if (d2 < R2) {
            const f = (1 - Math.sqrt(d2) / R) ** 2
            pos[q] += clamp(ptr.vx * f * 0.9, -R * 0.15, R * 0.15)
            pos[q + 1] += clamp(ptr.vy * f * 0.5, -R * 0.1, R * 0.1)
            pos[q + 2] += f * (ptr.pressed ? 9 : 2.5)
            if (ptr.pressed) pos[q] += (ptr.x - pos[q]) * f * 0.22
          }
        }
      }
    }
    // keep the cloth one piece: neighbours stay as far apart as the shape says
    for (let it = 0; it < 3; it++) {
      for (let j = 0; j < NY; j++) {
        for (let i = 0; i < NX; i++) {
          const a = (j * NX + i) * 3
          for (let d = 0; d < 2; d++) {
            const ni = i + (d === 0 ? 1 : 0)
            const nj = j + (d === 1 ? 1 : 0)
            if (ni >= NX || nj >= NY) continue
            const b = (nj * NX + ni) * 3
            const rx = tgt[b] - tgt[a]
            const ry = tgt[b + 1] - tgt[a + 1]
            const rz = tgt[b + 2] - tgt[a + 2]
            const rest = Math.sqrt(rx * rx + ry * ry + rz * rz)
            const dx = pos[b] - pos[a]
            const dy = pos[b + 1] - pos[a + 1]
            const dz = pos[b + 2] - pos[a + 2]
            const cur = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-5
            const corr = (cur - rest) / cur
            const wa = j === 0 ? 0 : 1
            const wb = nj === 0 ? 0 : 1
            const tot = wa + wb
            if (!tot) continue
            pos[a] += (dx * corr * wa) / tot
            pos[a + 1] += (dy * corr * wa) / tot
            pos[a + 2] += (dz * corr * wa) / tot
            pos[b] -= (dx * corr * wb) / tot
            pos[b + 1] -= (dy * corr * wb) / tot
            pos[b + 2] -= (dz * corr * wb) / tot
          }
        }
      }
    }
    for (let i = 0; i < NX; i++) {
      const q = i * 3
      pos[q] = tgt[q]
      pos[q + 1] = tgt[q + 1]
      pos[q + 2] = tgt[q + 2]
    }
  }

  const normals = (p) => {
    const { pos, nrm } = p
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const l = (j * NX + Math.max(0, i - 1)) * 3
        const r = (j * NX + Math.min(NX - 1, i + 1)) * 3
        const u = (Math.max(0, j - 1) * NX + i) * 3
        const d = (Math.min(NY - 1, j + 1) * NX + i) * 3
        const ax = pos[r] - pos[l]
        const ay = pos[r + 1] - pos[l + 1]
        const az = pos[r + 2] - pos[l + 2]
        const bx = pos[d] - pos[u]
        const by = pos[d + 1] - pos[u + 1]
        const bz = pos[d + 2] - pos[u + 2]
        let nx = ay * bz - az * by
        let ny = az * bx - ax * bz
        let nz = ax * by - ay * bx
        if (nz < 0) {
          nx = -nx
          ny = -ny
          nz = -nz
        }
        const len = Math.hypot(nx, ny, nz) || 1
        const q = (j * NX + i) * 3
        nrm[q] = nx / len
        nrm[q + 1] = ny / len
        nrm[q + 2] = nz / len
      }
    }
  }

  gl.enable(gl.DEPTH_TEST)
  gl.clearColor(0, 0, 0, 0)

  const frame = (now) => {
    if (dead) return
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (!visible || document.hidden) return
    t += dt

    if (ctl.live() && autoAt === Infinity && !drag && !firedParted) autoAt = now + 5500
    if (now > autoAt && !drag && eT < 1) {
      eT = 1
      rate = 1.1 // the curtain opens itself, slowly, if nobody does
    }
    e += (eT - e) * Math.min(1, dt * rate)
    if (eT === 1 && e > 0.995) e = 1
    if (!firedParted && eT === 1 && e > 0.38) {
      firedParted = true
      ctl.parted(true)
    }
    // tied back, they have done their job and would only sit in the way: let them slide off and stop drawing
    if (firedParted && e === 1) {
      settled += dt
      if (settled > 1.1) {
        leave = Math.min(1, leave + dt / 0.9)
        canvas.style.opacity = String(1 - leave * leave)
        if (leave >= 1) {
          dead = true
          cancelAnimationFrame(raf)
          setTimeout(() => ctl.gone?.(), 0)
          return
        }
      }
    }
    ptr.vx *= 0.8
    ptr.vy *= 0.8

    // the lamp wanders across the cloth; a finger or mouse takes it
    const lx = W * (0.5 + 0.55 * Math.sin(t * 0.45))
    const ly = H * (0.32 + 0.12 * Math.sin(t * 0.31 + 1))
    light.x += ((ptr.on ? ptr.x : lx) - light.x) * Math.min(1, dt * (ptr.on ? 9 : 2))
    light.y += ((ptr.on ? ptr.y : ly) - light.y) * Math.min(1, dt * (ptr.on ? 9 : 2))

    for (const p of panels) {
      shape(p, e)
      if (!p.ready) {
        p.pos.set(p.tgt)
        p.prev.set(p.tgt)
        p.ready = true
      }
      step(p, dt, t)
      normals(p)
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(prog)
    gl.uniform2f(U.uView, W, H)
    gl.uniform2f(U.uLight, light.x, light.y)
    gl.uniform2f(U.uCells, (W * 0.53) / PITCH, (H + 16) / PITCH)
    gl.uniform1f(U.uTime, t)
    gl.uniform1f(U.uOpen, e)
    for (const p of panels) {
      gl.bindVertexArray(p.vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, p.posBuf)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, p.pos)
      gl.bindBuffer(gl.ARRAY_BUFFER, p.nrmBuf)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, p.nrm)
      gl.drawElements(gl.TRIANGLES, p.count, gl.UNSIGNED_SHORT, 0)
    }
    gl.bindVertexArray(null)
  }
  raf = requestAnimationFrame(frame)

  canvas.addEventListener(
    'webglcontextlost',
    (ev) => {
      ev.preventDefault()
      dead = true
      cancelAnimationFrame(raf)
      ctl.fail()
    },
    false,
  )

  return () => {
    dead = true
    cancelAnimationFrame(raf)
    ro.disconnect()
    io.disconnect()
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointercancel', onUp)
    canvas.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('pointermove', winMove)
    window.removeEventListener('touchmove', winMove)
    gl.deleteProgram(prog)
  }
}

export default function Tirai({ t, live, onParted }) {
  const ref = useRef(null)
  const [parted, setParted] = useState(false)
  const [gone, setGone] = useState(false)
  const [engaged, setEngaged] = useState(false) // the guest has touched the curtain: the hint can go
  const ctl = useRef({})
  const partedRef = useRef(false)
  const liveRef = useRef(live)
  liveRef.current = live
  const cbRef = useRef(onParted)
  cbRef.current = onParted

  useEffect(() => {
    const c = ctl.current
    const finish = () => {
      if (partedRef.current) return
      partedRef.current = true
      setParted(true)
      cbRef.current?.()
    }
    c.live = () => liveRef.current
    c.parted = (set) => {
      if (set) finish()
      return partedRef.current
    }
    c.fail = finish
    c.engage = () => setEngaged(true)
    const stop = ref.current ? start(ref.current, c) : null
    c.gone = () => {
      stop?.()
      setGone(true)
    }
    if (!stop) {
      finish() // no WebGL2: the card just opens
      return
    }
    return stop
  }, [])

  if (gone) return null
  return (
    <>
      <canvas ref={ref} className={`tirai${parted ? ' parted' : ''}`} aria-hidden="true" />
      {!parted && live && (
        <div className={`tirai-ui${engaged ? ' gone' : ''}`}>
          <p className="tirai-hint" aria-hidden="true">
            <span>‹</span> {t.tiraiHint} <span>›</span>
          </p>
          <button className="btn btn-gold" type="button" onClick={() => ctl.current.open?.()}>
            {t.tiraiBtn}
          </button>
        </div>
      )}
    </>
  )
}
