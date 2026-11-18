import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Float, Lightformer, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { makeCardCanvas, makeEnvelopeCanvas, makeSealCanvas } from './textures'

const W = 2.5
const H = 3.5

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const seg = (t, a, b) => clamp01((t - a) / (b - a))
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const easeOut = (x) => 1 - Math.pow(1 - x, 3)

function frontShape() {
  // envelope front: a rectangle with a V notch cut from the top
  const s = new THREE.Shape()
  s.moveTo(-W / 2, -H / 2)
  s.lineTo(W / 2, -H / 2)
  s.lineTo(W / 2, H / 2)
  s.lineTo(0, 0.28)
  s.lineTo(-W / 2, H / 2)
  s.closePath()
  return s
}

function flapShape() {
  const s = new THREE.Shape()
  s.moveTo(-W / 2, 0)
  s.lineTo(W / 2, 0)
  s.lineTo(0, -1.5)
  s.closePath()
  return s
}

function useTextures({ a, b, eyebrow, dateText }) {
  const [tex, setTex] = useState(null)
  useEffect(() => {
    let alive = true
    const built = []
    const load = Promise.race([
      Promise.all([
        document.fonts.load('italic 500 120px "Cormorant Garamond"'),
        document.fonts.load('400 80px "Pinyon Script"'),
        document.fonts.load('500 40px "Jost Variable"'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ])
    load
      .catch(() => {})
      .then(async () => {
        if (!alive) return
        const mk = (canvas) => {
          const t = new THREE.CanvasTexture(canvas)
          t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = 8
          built.push(t)
          return t
        }
        const env = mk(makeEnvelopeCanvas())
        env.wrapS = env.wrapT = THREE.RepeatWrapping
        env.repeat.set(1 / W, 1 / H)
        env.offset.set(0.5, 0.5)
        const flap = env.clone()
        flap.needsUpdate = true
        flap.offset.set(0.5, 1.75 / H + 0.5)
        built.push(flap)
        const card = mk(await makeCardCanvas({ a, b, eyebrow, dateText }))
        const seal = mk(makeSealCanvas(a, b))
        if (alive) setTex({ env, flap, card, seal })
      })
    return () => {
      alive = false
      built.forEach((t) => t.dispose())
    }
  }, [a, b, eyebrow, dateText])
  return tex
}

function Scene({ go, pointerRef, textures, onReady, onWash, onDone }) {
  const { size, camera } = useThree()
  const tilt = useRef()
  const flap = useRef()
  const card = useRef()
  const seal = useRef()
  const glow = useRef()
  const sealMats = useRef([])
  const goAt = useRef(null)
  const fired = useRef({ ready: false, wash: false, done: false })

  const geo = useMemo(() => {
    const ext = (shape, depth) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
    return {
      front: ext(frontShape(), 0.02),
      flap: ext(flapShape(), 0.012),
      liner: new THREE.ShapeGeometry(flapShape()),
    }
  }, [])

  const mats = useMemo(() => {
    const paper = (map) =>
      new THREE.MeshStandardMaterial({ map, roughness: 0.52, metalness: 0.18, envMapIntensity: 0.7 })
    const edge = new THREE.MeshStandardMaterial({ color: '#d9b56a', metalness: 1, roughness: 0.32, envMapIntensity: 1.1 })
    const gold = new THREE.MeshStandardMaterial({ color: '#dcb961', metalness: 1, roughness: 0.24, envMapIntensity: 1.35 })
    const liner = new THREE.MeshStandardMaterial({ color: '#f1e7cf', roughness: 0.7, metalness: 0.05 })
    const cardFace = new THREE.MeshStandardMaterial({
      map: textures.card,
      emissiveMap: textures.card,
      emissive: '#ffffff',
      emissiveIntensity: 0.18,
      roughness: 0.6,
      metalness: 0.05,
    })
    const cardSide = new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.8 })
    const cardBack = new THREE.MeshStandardMaterial({ color: '#f4ecd9', roughness: 0.8 })
    const decal = new THREE.MeshStandardMaterial({
      map: textures.seal,
      transparent: true,
      metalness: 0.7,
      roughness: 0.38,
      envMapIntensity: 1,
    })
    return {
      front: [paper(textures.env), edge],
      flap: [paper(textures.flap), edge],
      back: new THREE.MeshStandardMaterial({ color: '#06261d', roughness: 0.75 }),
      liner,
      gold,
      decal,
      card: [cardSide, cardSide, cardSide, cardSide, cardFace, cardBack],
    }
  }, [textures])

  useEffect(() => {
    const list = []
    seal.current?.traverse((o) => {
      if (o.material) {
        o.material.transparent = true
        list.push(o.material)
      }
    })
    sealMats.current = list
  }, [])

  useFrame((state, delta) => {
    const now = state.clock.elapsedTime
    const aspect = size.width / size.height
    const dBase = Math.max(5.5 / aspect, 10.1)

    if (!fired.current.ready) {
      fired.current.ready = true
      onReady?.()
    }
    if (go && goAt.current === null) goAt.current = now
    const t = goAt.current === null ? 0 : now - goAt.current

    const intro = easeOut(clamp01(now / 1.5))
    const camP = easeInOut(seg(t, 2.9, 4.5))
    const follow = easeInOut(seg(t, 1.25, 2.9))

    // pointer parallax, relaxed to zero as the camera dives in
    const p = pointerRef.current
    const calm = 1 - camP
    tilt.current.rotation.y = THREE.MathUtils.damp(
      tilt.current.rotation.y,
      p.x * 0.3 * calm + (1 - intro) * -0.7,
      4,
      delta,
    )
    tilt.current.rotation.x = THREE.MathUtils.damp(tilt.current.rotation.x, -p.y * 0.18 * calm, 4, delta)
    tilt.current.scale.setScalar(0.86 + 0.14 * intro)

    // seal: idle pulse, crack, fall
    const shake = seg(t, 0, 0.45)
    const fall = seg(t, 0.4, 1.5)
    const idle = 1 + 0.035 * Math.sin(now * 2.4)
    const sealScale = go ? 1 + 0.22 * easeOut(shake) : idle
    seal.current.scale.setScalar(sealScale * (1 - 0.18 * fall))
    seal.current.position.set(0, 0.4 - 3.8 * fall * fall, 0.07 + 0.6 * fall)
    seal.current.rotation.z = fall * 1.6 + (go ? Math.sin(t * 46) * 0.05 * (1 - shake) : 0)
    const sealOpacity = 1 - seg(t, 1.0, 1.5)
    sealMats.current.forEach((m) => (m.opacity = sealOpacity))
    glow.current.intensity = (go ? 9 * (1 - fall) : 5 + 2 * Math.sin(now * 2.4)) * sealOpacity

    // flap swings up and leans back
    flap.current.rotation.x = -easeInOut(seg(t, 0.5, 1.6)) * Math.PI * 1.04

    // card slides out then floats forward and grows
    const rise = easeInOut(seg(t, 1.25, 2.55))
    const fwd = easeOut(seg(t, 2.1, 2.9))
    card.current.position.set(0, -0.15 + 1.25 * rise, 0.015 + 0.885 * fwd)
    card.current.scale.setScalar(1 + 0.1 * fwd + 0.6 * camP)

    // camera
    const cy = THREE.MathUtils.lerp(0.45 * follow, 1.1, camP)
    const cz = THREE.MathUtils.lerp(dBase, 0.9 + 5.4, camP)
    camera.position.set(0, cy, cz)
    camera.lookAt(0, cy, 0)

    if (t > 3.95 && !fired.current.wash) {
      fired.current.wash = true
      onWash?.()
    }
    if (t > 4.7 && !fired.current.done) {
      fired.current.done = true
      onDone?.()
    }
  })

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 6]} intensity={2.6} color="#fff1d6" />
      <directionalLight position={[-5, -2, 3]} intensity={0.8} color="#9fe3cf" />
      <pointLight ref={glow} position={[0, 0.4, 1.4]} color="#ffcf7a" intensity={5} distance={6} decay={2} />

      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={1.5} color="#ffe7b0" position={[0, 0.5, 9]} scale={[12, 9, 1]} />
        <Lightformer form="rect" intensity={3.4} color="#fff0cf" position={[0, 4, 4]} scale={[8, 2.4, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#ffd9a0" position={[-5, 0, 2]} rotation={[0, Math.PI / 2, 0]} scale={[5, 4, 1]} />
        <Lightformer form="ring" intensity={1.4} color="#ffffff" position={[4, 1, 3]} scale={3} />
        <Lightformer form="rect" intensity={1.2} color="#bfe9dc" position={[5, -3, -2]} rotation={[0, -Math.PI / 2, 0]} scale={[5, 3, 1]} />
      </Environment>

      <Sparkles count={70} scale={[9, 11, 4]} size={4} speed={0.35} opacity={0.9} color="#f3dfa2" noise={0.6} />

      <group ref={tilt}>
        <Float speed={1.6} rotationIntensity={0.15} floatIntensity={0.45} floatingRange={[-0.06, 0.06]}>
          <group>
            <mesh position={[0, 0, -0.011]} material={mats.back}>
              <boxGeometry args={[W, H, 0.022]} />
            </mesh>

            <mesh ref={card} position={[0, -0.15, 0.015]} material={mats.card}>
              <boxGeometry args={[2.2, 3.1, 0.012]} />
            </mesh>

            <mesh position={[0, 0, 0.03]} geometry={geo.front} material={mats.front} />

            <group ref={flap} position={[0, H / 2, 0.052]}>
              <mesh geometry={geo.flap} material={mats.flap} />
              <mesh geometry={geo.liner} position={[0, 0, -0.004]} rotation={[0, Math.PI, 0]} scale={[0.94, 0.94, 1]} material={mats.liner} />
            </group>

            <group ref={seal} position={[0, 0.4, 0.07]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.gold}>
                <cylinderGeometry args={[0.33, 0.36, 0.07, 64]} />
              </mesh>
              <mesh position={[0, 0, 0.036]} material={mats.gold}>
                <torusGeometry args={[0.27, 0.018, 16, 64]} />
              </mesh>
              <mesh position={[0, 0, 0.037]} material={mats.decal}>
                <circleGeometry args={[0.25, 48]} />
              </mesh>
            </group>
          </group>
        </Float>
      </group>
    </>
  )
}

export default function EnvelopeScene({ go, pointerRef, labels, onReady, onWash, onDone }) {
  const textures = useTextures(labels)
  if (!textures) return null
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 35, near: 1, far: 60, position: [0, 0, 12] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      aria-hidden="true"
    >
      <Scene go={go} pointerRef={pointerRef} textures={textures} onReady={onReady} onWash={onWash} onDone={onDone} />
    </Canvas>
  )
}
