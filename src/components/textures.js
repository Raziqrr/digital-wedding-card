// Procedural canvas textures: no image assets needed, fonts come from @fontsource.
const GOLD = '#d9b56a'
const GOLD_L = '#f3dfa2'
const GOLD_D = '#9c7a32'

function make(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

function speckle(g, w, h, count, alpha) {
  g.save()
  g.globalAlpha = alpha
  for (let i = 0; i < count; i++) {
    g.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#000000'
    g.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6)
  }
  g.restore()
}

// "Pucuk rebung" (bamboo shoot) triangles — the classic songket border motif.
function rebungRow(g, x0, x1, baseY, h, count, alpha) {
  const w = (x1 - x0) / count
  g.save()
  g.strokeStyle = GOLD
  g.fillStyle = GOLD
  for (let i = 0; i < count; i++) {
    const x = x0 + i * w
    g.globalAlpha = alpha * 0.14
    g.beginPath()
    g.moveTo(x, baseY)
    g.lineTo(x + w / 2, baseY - h)
    g.lineTo(x + w, baseY)
    g.closePath()
    g.fill()
    g.globalAlpha = alpha
    g.lineWidth = 2.2
    g.stroke()
    g.beginPath()
    g.moveTo(x + w * 0.22, baseY)
    g.lineTo(x + w / 2, baseY - h * 0.62)
    g.lineTo(x + w * 0.78, baseY)
    g.stroke()
    g.beginPath()
    g.moveTo(x + w * 0.38, baseY)
    g.lineTo(x + w / 2, baseY - h * 0.3)
    g.lineTo(x + w * 0.62, baseY)
    g.stroke()
  }
  g.restore()
}

function spaced(g, text, x, y, spacing) {
  const chars = [...text]
  const widths = chars.map((ch) => g.measureText(ch).width)
  const total = widths.reduce((s, w) => s + w, 0) + spacing * (chars.length - 1)
  let cx = x - total / 2
  const prev = g.textAlign
  g.textAlign = 'left'
  chars.forEach((ch, i) => {
    g.fillText(ch, cx, y)
    cx += widths[i] + spacing
  })
  g.textAlign = prev
}

// Envelope surface: emerald silk, songket lattice, gold frame, rebung band.
// Mapped 1:1 onto a 2.5 x 3.5 envelope.
export function makeEnvelopeCanvas() {
  const W = 1024
  const H = 1434
  const [c, g] = make(W, H)

  const bg = g.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0f6150')
  bg.addColorStop(0.55, '#08453a')
  bg.addColorStop(1, '#042c25')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)

  const sheen = g.createLinearGradient(0, H * 0.15, W, H * 0.65)
  sheen.addColorStop(0, 'rgba(255,255,255,0)')
  sheen.addColorStop(0.5, 'rgba(255,240,200,0.08)')
  sheen.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = sheen
  g.fillRect(0, 0, W, H)

  // diamond lattice
  const step = 96
  g.strokeStyle = GOLD
  g.lineWidth = 1.4
  g.globalAlpha = 0.16
  const kMin = -Math.ceil(H / step)
  const kMax = Math.ceil((W + H) / step) + 1
  for (let k = kMin; k < kMax; k++) {
    g.beginPath()
    g.moveTo(k * step, 0)
    g.lineTo(k * step + H, H)
    g.stroke()
    g.beginPath()
    g.moveTo(k * step, 0)
    g.lineTo(k * step - H, H)
    g.stroke()
  }

  // tiny diamonds at lattice crossings
  g.globalAlpha = 0.42
  g.fillStyle = GOLD
  for (let a = -40; a < 60; a++) {
    for (let b = -10; b < 60; b++) {
      const x = ((a + b) * step) / 2
      const y = ((b - a) * step) / 2
      if (x < 80 || x > W - 80 || y < 80 || y > H - 200) continue
      g.beginPath()
      g.moveTo(x, y - 6)
      g.lineTo(x + 4, y)
      g.lineTo(x, y + 6)
      g.lineTo(x - 4, y)
      g.closePath()
      g.fill()
    }
  }

  // frame
  g.globalAlpha = 1
  g.strokeStyle = GOLD
  g.lineWidth = 4
  g.strokeRect(34, 34, W - 68, H - 68)
  g.globalAlpha = 0.55
  g.lineWidth = 1.6
  g.strokeRect(54, 54, W - 108, H - 108)

  // band
  g.globalAlpha = 0.9
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(70, H - 70)
  g.lineTo(W - 70, H - 70)
  g.stroke()
  rebungRow(g, 70, W - 70, H - 70, 104, 14, 0.9)
  g.globalAlpha = 0.5
  g.beginPath()
  g.moveTo(70, H - 200)
  g.lineTo(W - 70, H - 200)
  g.stroke()

  // folded-flap edge (V notch on the front panel)
  g.globalAlpha = 1
  g.lineJoin = 'round'
  g.strokeStyle = GOLD_D
  g.lineWidth = 9
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(W / 2, H * 0.42)
  g.lineTo(W, 0)
  g.stroke()
  g.strokeStyle = GOLD_L
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(0, 6)
  g.lineTo(W / 2, H * 0.42 + 6)
  g.lineTo(W, 6)
  g.stroke()

  speckle(g, W, H, 9000, 0.05)
  return c
}

// The invitation card that slides out.
export async function makeCardCanvas({ a, b, eyebrow, dateText }) {
  const W = 880
  const H = 1240
  const [c, g] = make(W, H)

  g.fillStyle = '#f7f1e3'
  g.fillRect(0, 0, W, H)
  const rg = g.createRadialGradient(W / 2, H * 0.4, 80, W / 2, H * 0.45, H * 0.78)
  rg.addColorStop(0, 'rgba(255,255,255,0.6)')
  rg.addColorStop(1, 'rgba(200,170,110,0.22)')
  g.fillStyle = rg
  g.fillRect(0, 0, W, H)
  speckle(g, W, H, 5000, 0.05)

  // double gold frame with notched corners
  g.strokeStyle = GOLD
  g.lineWidth = 5
  g.strokeRect(36, 36, W - 72, H - 72)
  g.lineWidth = 1.6
  g.globalAlpha = 0.7
  g.strokeRect(58, 58, W - 116, H - 116)
  g.globalAlpha = 1
  g.fillStyle = GOLD
  for (const [x, y] of [[36, 36], [W - 36, 36], [36, H - 36], [W - 36, H - 36]]) {
    g.beginPath()
    g.moveTo(x, y - 14)
    g.lineTo(x + 14, y)
    g.lineTo(x, y + 14)
    g.lineTo(x - 14, y)
    g.closePath()
    g.fill()
  }

  g.textAlign = 'center'
  g.fillStyle = GOLD_D
  g.font = '500 30px "Jost Variable", sans-serif'
  spaced(g, eyebrow.toUpperCase(), W / 2, 190, 12)

  // ornament
  g.strokeStyle = GOLD
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(W / 2 - 160, 236)
  g.lineTo(W / 2 - 24, 236)
  g.moveTo(W / 2 + 24, 236)
  g.lineTo(W / 2 + 160, 236)
  g.stroke()
  g.beginPath()
  g.moveTo(W / 2, 222)
  g.lineTo(W / 2 + 14, 236)
  g.lineTo(W / 2, 250)
  g.lineTo(W / 2 - 14, 236)
  g.closePath()
  g.fill()

  const gold = g.createLinearGradient(0, 330, 0, 960)
  gold.addColorStop(0, '#b8913f')
  gold.addColorStop(0.35, '#f0d994')
  gold.addColorStop(0.6, '#c39b46')
  gold.addColorStop(1, '#8a6a2a')
  g.fillStyle = gold
  g.font = 'italic 500 340px "Cormorant Garamond", serif'
  g.fillText(a, W / 2, 560)
  g.font = 'italic 500 190px "Cormorant Garamond", serif'
  g.fillText('&', W / 2, 735)
  g.font = 'italic 500 340px "Cormorant Garamond", serif'
  g.fillText(b, W / 2, 930)

  g.fillStyle = GOLD_D
  g.font = '500 30px "Jost Variable", sans-serif'
  spaced(g, dateText, W / 2, 1020, 8)

  rebungRow(g, 150, W - 150, H - 100, 62, 12, 0.85)
  return c
}

export function makeSealCanvas(a, b) {
  const S = 256
  const [c, g] = make(S, S)
  g.strokeStyle = 'rgba(66,44,8,0.8)'
  g.lineWidth = 5
  g.beginPath()
  g.arc(S / 2, S / 2, 108, 0, Math.PI * 2)
  g.stroke()
  g.lineWidth = 2
  g.beginPath()
  g.arc(S / 2, S / 2, 96, 0, Math.PI * 2)
  g.stroke()
  g.fillStyle = 'rgba(66,44,8,0.88)'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = 'italic 500 104px "Cormorant Garamond", serif'
  g.fillText(`${a}`, S / 2 - 40, S / 2 + 4)
  g.font = '400 70px "Pinyon Script", cursive'
  g.fillText('&', S / 2, S / 2 - 2)
  g.font = 'italic 500 104px "Cormorant Garamond", serif'
  g.fillText(`${b}`, S / 2 + 42, S / 2 + 8)
  return c
}
