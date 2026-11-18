import { MOTIF_GLSL } from './songketGLSL'
import { useEffect, useRef } from 'react'

/* ============================================================
   The page's ground is cloth, drawn as cloth.
   One full-screen shader, thread by thread: silk warp and weft in
   two colours (shot silk), motifs floated in gold weft the way a
   songket weaver sets them (stair-stepped, on a half-drop spread
   of scattered flowers), and a lamp that the gold answers to: a
   finger, a mouse, a tilt of the phone, a fast scroll.
   The loom edge follows the scroll, so the cloth is woven just
   under what you are reading.
   Anything that fails (no WebGL2, slow GPU, quiet mode) leaves
   the CSS cloth in place.
   ============================================================ */

const VERT = `#version 300 es
in vec2 a;
void main(){ gl_Position = vec4(a, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
precision highp int;
out vec4 outColor;

uniform vec2  uView;        // viewport, css px
uniform vec2  uBuf;         // drawing buffer, px
uniform float uScroll;      // cloth scroll (parallax), css px
uniform float uScrollReal;  // document scroll, css px
uniform float uTime;
uniform vec2  uLight;       // lamp, viewport css px
uniform vec2  uTilt;        // how the phone is held, -1..1
uniform float uFast;        // 1 while scrolling fast: skip the thread relief, keep the colour
uniform float uProg;        // how far down the page: morning at the Akad, late afternoon at the Resepsi
uniform float uWoven;       // page y the loom has reached
uniform vec4  uPulse;       // x, y, start time, strength
uniform vec4  uDark[6];     // sections drawn in emerald: x0, y0, x1, y1 (document px)
uniform int   uNDark;

#define PITCH 3.0
${MOTIF_GLSL}

// has the shuttle been through this row yet? Rows alternate direction.
float rowWoven(float row, float x, out float lead){
  lead = 0.0;
  float rowY = row * PITCH;
  float gap = uWoven - rowY;
  if (gap > 190.0) return 1.0;
  float prog = clamp(gap / 110.0 - h11(row) * 0.6, 0.0, 1.0);
  float xn = clamp(x / uView.x, 0.0, 1.0);
  float reach = mod(row, 2.0) < 1.0 ? xn : 1.0 - xn;
  if (prog > 0.0 && prog < 1.0) lead = 1.0 - smoothstep(0.0, 0.018, abs(reach - prog));
  return step(reach, prog);
}

float heightAt(vec2 p, out float isGold, out float warpOver, out float rnd, out float wv, out float lead){
  vec2 g = p / PITCH;
  vec2 c = floor(g);
  vec2 f = fract(g);
  wv = rowWoven(c.y, p.x, lead);
  float m = motifAt(c, rnd) * wv;
  isGold = m;
  float over = mod(c.x + c.y, 2.0);
  warpOver = over;
  vec2 w = f * 2.0 - 1.0;
  float hWarp = sqrt(max(1.0 - w.x * w.x, 0.0)) * (1.0 - 0.55 * pow(abs(w.y), 3.0));
  float hWeft = sqrt(max(1.0 - w.y * w.y, 0.0)) * (1.0 - 0.55 * pow(abs(w.x), 3.0));
  float silk = 0.3 + 0.24 * mix(hWeft, hWarp, over);
  silk = mix(over > 0.5 ? silk : silk * 0.35, silk, wv);   // weft not laid yet: only the warp stands
  float prof = sqrt(max(1.0 - w.y * w.y, 0.0));
  float twist = 0.5 + 0.5 * sin(g.x * 5.6 + c.y * 1.7);
  float gold = 0.74 + 0.2 * prof + 0.06 * twist;
  return mix(silk, gold, m);
}

float darkAt(vec2 pg){
  float d = 0.0;
  for (int i = 0; i < 6; i++){
    if (i >= uNDark) break;
    vec4 r = uDark[i];
    float inx = step(r.x - 1.0, pg.x) * step(pg.x, r.z + 1.0);
    float iny = smoothstep(r.y - 6.0, r.y + 6.0, pg.y) * (1.0 - smoothstep(r.w - 6.0, r.w + 6.0, pg.y));
    d = max(d, inx * iny);
  }
  return d;
}

void main(){
  vec2 pv = vec2(gl_FragCoord.x / uBuf.x * uView.x, (1.0 - gl_FragCoord.y / uBuf.y) * uView.y);
  vec2 page = vec2(pv.x, pv.y + uScroll);
  float dark = darkAt(vec2(pv.x, pv.y + uScrollReal));

  float g0, w0, r0, v0, l0;
  float g1, w1, r1, v1, l1;
  float g2, w2, r2, v2, l2;
  float e = 0.75;
  float h0 = heightAt(page, g0, w0, r0, v0, l0);
  float h1 = h0;
  float h2 = h0;
  if (uFast < 0.5){
    h1 = heightAt(page + vec2(e, 0.0), g1, w1, r1, v1, l1);
    h2 = heightAt(page + vec2(0.0, e), g2, w2, r2, v2, l2);
  }
  float bump = mix(0.9, 2.1, g0);
  vec3 N = normalize(vec3(-(h1 - h0) / e * bump, -(h2 - h0) / e * bump, 1.0));

  // colour: shot silk, warp one colour and weft another, thread by thread
  vec2 cell = floor(page / PITCH);
  vec3 warpC = mix(vec3(0.93, 0.80, 0.76), vec3(0.040, 0.300, 0.235), dark);
  vec3 weftC = mix(vec3(0.90, 0.92, 0.82), vec3(0.020, 0.150, 0.125), dark);
  float slub = 0.93 + 0.14 * h11(w0 > 0.5 ? cell.x * 1.7 : cell.y * 2.3 + 50.0);
  vec3 silk = mix(weftC, warpC, w0) * slub;
  silk *= 0.95 + 0.1 * vnoise(page / 150.0 - 3.0);
  vec3 tint = mix(vec3(1.04, 0.97, 0.96), vec3(0.96, 1.03, 0.97), vnoise(page / 430.0 + 7.0));
  silk *= mix(tint, vec3(1.0), dark);
  silk *= mix(mix(1.12, 0.62, dark), 1.0, v0);   // unwoven: a pale ghost by day, deeper on the emerald
  vec3 goldBase = mix(vec3(0.80, 0.60, 0.22), vec3(0.46, 0.34, 0.09), dark) * (0.9 + 0.2 * r0);
  float rowF = fract(page.y / PITCH) * 2.0 - 1.0;
  goldBase *= 0.74 + 0.26 * sqrt(max(1.0 - rowF * rowF, 0.0));          // each float is a round thread: its edges sit in shadow
  vec3 alb = mix(silk, goldBase, g0 * mix(0.62, 0.9, dark));             // tone on tone by day, brighter on the dark cloth

  // light: one lamp, strand highlights along each thread (Kajiya-Kay)
  float grade = smoothstep(0.1, 0.85, uProg);
  vec3 lampC = mix(vec3(0.93, 0.97, 1.0), vec3(1.0, 0.8, 0.52), grade);
  float lamp = 1.0 + 0.035 * sin(uTime * 6.3) + 0.025 * sin(uTime * 11.7 + 2.0);
  vec3 Lv = vec3(uLight - pv, 240.0);
  float dist = length(Lv);
  vec3 L = Lv / dist;
  float att = 1.0 / (1.0 + pow(dist / (uView.y * 0.9), 2.0));
  float diff = max(dot(N, L), 0.0);
  vec3 V = normalize(vec3(uTilt * 0.6, 1.0));
  vec3 H = normalize(L + V);
  vec3 T = (w0 * (1.0 - g0) > 0.5) ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  float th = dot(T, H);
  float strand = pow(sqrt(max(1.0 - th * th, 0.0)), mix(40.0, 120.0, g0));
  float twist = 0.5 + 0.5 * sin(page.x / PITCH * 5.6 + cell.y * 1.7);
  float spec = strand * smoothstep(0.0, 0.3, diff) * att * lamp;

  vec3 col = alb * (0.85 + 0.19 * diff * att * 1.7 * lamp);
  col += mix(vec3(1.0, 0.92, 0.7), vec3(1.0, 0.84, 0.5), grade) * spec * g0 * mix(0.6, 0.2, dark) * (0.55 + 0.9 * twist);
  col += vec3(1.0, 0.97, 0.92) * spec * (1.0 - g0) * mix(0.12, 0.07, dark);
  col += lampC * att * att * 0.022 * lamp * (1.0 - 0.5 * dark);
  col *= mix(vec3(0.985, 1.0, 1.02), vec3(1.025, 0.99, 0.95), grade);

  // a tap sends a ring of light across the threads
  if (uPulse.w > 0.0){
    float age = uTime - uPulse.z;
    if (age >= 0.0 && age < 2.0){
      float rr = age * 560.0;
      float ring = exp(-pow((length(pv - uPulse.xy) - rr) / 34.0, 2.0)) * (1.0 - age / 2.0) * uPulse.w;
      col += vec3(1.0, 0.9, 0.6) * ring * (g0 * mix(0.42, 0.15, dark) + 0.04);
    }
  }
  col = mix(col, vec3(1.0, 0.9, 0.55), l0 * 0.9);   // the shuttle itself
  col += (h21(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const PAR = 1 // 1:1 with the page: any slower and the cloth reads as lagging behind it

function compile(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[cloth] shader:', gl.getShaderInfoLog(s))
    gl.deleteShader(s)
    return null
  }
  return s
}

function start(canvas, activeRef) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' })
  if (!gl) return null
  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null
  const prog = gl.createProgram()
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[cloth] link:', gl.getProgramInfoLog(prog))
    return null
  }
  gl.useProgram(prog)
  const U = {}
  for (const n of ['uView', 'uBuf', 'uScroll', 'uScrollReal', 'uTime', 'uLight', 'uTilt', 'uProg', 'uFast', 'uWoven', 'uPulse', 'uNDark']) U[n] = gl.getUniformLocation(prog, n)
  U.uDark = gl.getUniformLocation(prog, 'uDark[0]')
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'a')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const root = document.documentElement
  const dprBase = Math.min(window.devicePixelRatio || 1, 1.5)
  let quality = 1
  let vw = 0
  let vh = 0
  const dark = new Float32Array(24)
  let nDark = 0
  let docH = 1

  const measure = () => {
    const sy = window.scrollY
    docH = Math.max(1, document.documentElement.scrollHeight - vh)
    const els = document.querySelectorAll('.events, .rsvp, .footer')
    nDark = Math.min(6, els.length)
    for (let i = 0; i < nDark; i++) {
      const r = els[i].getBoundingClientRect()
      // reach 14px past each edge: the woven bands that join the sections hide the seam
      dark.set([-1e5, r.top + sy - 14, 1e5, r.bottom + sy + 14], i * 4) // full-bleed: also fills any gutter beside the page
    }
  }
  const resize = () => {
    // the canvas's own css size: a desktop scrollbar makes it narrower than innerWidth
    vw = canvas.clientWidth || window.innerWidth
    vh = canvas.clientHeight || window.innerHeight
    const s = dprBase * quality
    canvas.width = Math.max(2, Math.round(vw * s))
    canvas.height = Math.max(2, Math.round(vh * s))
    gl.viewport(0, 0, canvas.width, canvas.height)
    measure()
  }
  resize()

  /* ---------- state ---------- */
  let sy = window.scrollY
  let prevSy = sy
  let vel = 0
  let fast = 0
  let started = false
  let woven = 0
  let wovenTarget = 0
  const tgt = { x: vw * 0.5, y: vh * 0.4 }
  let inputW = 0
  let pressing = false
  let hover = false
  const tilt = { x: 0, y: 0 }
  const tiltT = { x: 0, y: 0 }
  let sensor = false
  const pulse = { x: 0, y: 0, t: -10, s: 0 }
  let slow = 0
  let drawn = 0
  let lastDraw = 0
  let dead = false
  let raf = 0
  const t0 = performance.now()
  let last = t0

  /* ---------- input ---------- */
  const on = (target, ev, fn, opt = { passive: true }) => {
    target.addEventListener(ev, fn, opt)
    return () => target.removeEventListener(ev, fn, opt)
  }
  const offs = []
  offs.push(
    on(window, 'pointermove', (e) => {
      if (e.pointerType !== 'mouse') return
      tgt.x = e.clientX
      tgt.y = e.clientY
      hover = true
    }),
    on(document, 'pointerleave', () => (hover = false)),
    on(window, 'touchstart', (e) => {
      const p = e.touches[0]
      tgt.x = p.clientX
      tgt.y = p.clientY
      pressing = true
    }),
    on(window, 'touchmove', (e) => {
      const p = e.touches[0]
      tgt.x = p.clientX
      tgt.y = p.clientY
    }),
    on(window, 'touchend', () => (pressing = false)),
    on(window, 'touchcancel', () => (pressing = false)),
    on(window, 'click', (e) => {
      pulse.x = e.clientX
      pulse.y = e.clientY
      pulse.t = (performance.now() - t0) / 1000
      pulse.s = 1
    }),
    on(window, 'deviceorientation', (e) => {
      if (e.gamma == null || e.beta == null) return
      sensor = true
      tiltT.x = clamp(e.gamma / 28, -1, 1)
      tiltT.y = clamp((e.beta - 45) / 28, -1, 1)
    }),
    on(window, 'resize', resize),
  )
  const ro = new ResizeObserver(measure)
  const main = document.querySelector('main')
  if (main) ro.observe(main)

  const fail = () => {
    if (dead) return
    dead = true
    cancelAnimationFrame(raf)
    root.removeAttribute('data-gl')
  }
  offs.push(
    on(
      canvas,
      'webglcontextlost',
      (e) => {
        e.preventDefault()
        fail()
      },
      false,
    ),
  )

  /* ---------- frame ---------- */
  const frame = (now) => {
    if (dead) return
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (document.hidden) return
    const t = (now - t0) / 1000

    sy = window.scrollY
    const v = (sy - prevSy) / Math.max(dt, 0.001)
    prevSy = sy
    vel += (v - vel) * Math.min(1, dt * 8)

    const goal = pressing || hover ? 1 : 0
    inputW += (goal - inputW) * Math.min(1, dt * (goal ? 10 : 1.4))
    const ox = vw * (0.5 + 0.36 * Math.sin(t * 0.21))
    const oy = vh * (0.4 + 0.2 * Math.sin(t * 0.17 + 1.3))
    const lx = ox + (tgt.x - ox) * inputW
    const ly = oy + (tgt.y - oy) * inputW - clamp(vel / 2200, -1, 1) * vh * 0.3

    const wantX = sensor ? tiltT.x : hover ? (tgt.x / vw - 0.5) * 1.3 : 0
    const wantY = sensor ? tiltT.y : hover ? (tgt.y / vh - 0.5) * 1.3 : 0
    const k = Math.min(1, dt * 4)
    tilt.x += (wantX - tilt.x) * k
    tilt.y += (wantY - tilt.y) * k
    const tx = tilt.x + 0.2 * Math.sin(t * 0.37)
    const ty = tilt.y + 0.14 * Math.sin(t * 0.29 + 1)

    // the browser scrolls the page ahead of what script can see: draw where the page is about to be
    fast = Math.abs(vel) > 500 ? 1 : Math.abs(vel) < 250 ? 0 : fast
    const syP = sy + clamp(vel, -4000, 4000) * 0.012
    // the loom follows the scroll
    const sc = syP * PAR
    if (activeRef.current && !started) {
      started = true
      woven = sc
    }
    if (started) {
      const want = sc + vh + 180 // the weaving edge stays just below the screen; a fast scroll outruns it and you see it catch up
      if (want > wovenTarget) {
        // a long jump (a link to #rsvp): do not make the reader wait for the whole stretch
        if (wovenTarget > 0 && want - wovenTarget > vh * 0.9) woven = want - vh * 0.25
        wovenTarget = want
      }
      const gap = wovenTarget - woven
      woven += Math.min(gap, Math.max(750 * dt, gap * Math.min(1, dt * 3)))
    }

    const pulsing = pulse.s > 0 && t - pulse.t < 2.1
    const moving = inputW > 0.02 || Math.abs(vel) > 20 || (started && woven < wovenTarget - 0.5) || pulsing
    if (!moving && now - lastDraw < 66) return // at rest the lamp only drifts: 15 frames a second is plenty
    lastDraw = now

    gl.uniform2f(U.uView, vw, vh)
    gl.uniform2f(U.uBuf, canvas.width, canvas.height)
    gl.uniform1f(U.uScroll, sc)
    gl.uniform1f(U.uScrollReal, syP)
    gl.uniform1f(U.uFast, fast)
    gl.uniform1f(U.uTime, t)
    gl.uniform2f(U.uLight, lx, ly)
    gl.uniform2f(U.uTilt, tx, ty)
    gl.uniform1f(U.uProg, clamp(sy / docH, 0, 1))
    gl.uniform1f(U.uWoven, started ? woven : -1000)
    gl.uniform4f(U.uPulse, pulse.x, pulse.y, pulse.t, pulsing ? pulse.s : 0)
    gl.uniform4fv(U.uDark, dark)
    gl.uniform1i(U.uNDark, nDark)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    if (drawn++ === 0) root.setAttribute('data-gl', '')

    // a slow device gets fewer pixels, then the plain CSS cloth
    if (moving && drawn > 40) {
      slow = dt > 0.03 ? slow + 1 : Math.max(0, slow - 1)
      if (slow > 45) {
        slow = 0
        if (quality > 0.6) {
          quality *= 0.75
          resize()
        } else {
          fail()
        }
      }
    }
  }
  raf = requestAnimationFrame(frame)

  return () => {
    dead = true
    cancelAnimationFrame(raf)
    offs.forEach((f) => f())
    ro.disconnect()
    root.removeAttribute('data-gl')
    gl.deleteProgram(prog)
    gl.deleteBuffer(buf)
  }
}

export default function Cloth({ active, calm }) {
  const ref = useRef(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    if (calm || !ref.current) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    return start(ref.current, activeRef) || undefined
  }, [calm])

  return calm ? null : <canvas ref={ref} className="cloth" aria-hidden="true" />
}
