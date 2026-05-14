'use strict'

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'app', 'assets')

// ─── shared helpers ────────────────────────────────────────────────────────

function drawBall(ctx, cx, cy, r) {
  // base radial gradient
  const grad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r)
  grad.addColorStop(0, '#f05555')
  grad.addColorStop(0.5, '#cc2222')
  grad.addColorStop(1, '#7a1010')
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  // shine
  const shine = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx - r * 0.1, cy - r * 0.1, r * 0.75)
  shine.addColorStop(0, 'rgba(255,255,255,0.35)')
  shine.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = shine
  ctx.fill()

  // seams
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = r * 0.033
  ctx.lineCap = 'round'

  // top seam arc
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.7, cy - r * 0.1)
  ctx.bezierCurveTo(cx - r * 0.3, cy - r * 0.65, cx + r * 0.3, cy - r * 0.65, cx + r * 0.7, cy - r * 0.1)
  ctx.stroke()

  // bottom seam arc
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.7, cy + r * 0.1)
  ctx.bezierCurveTo(cx - r * 0.3, cy + r * 0.65, cx + r * 0.3, cy + r * 0.65, cx + r * 0.7, cy + r * 0.1)
  ctx.stroke()

  // stitch lines (4 short vertical dashes)
  ctx.strokeStyle = 'rgba(255,255,255,0.38)'
  ctx.lineWidth = r * 0.022
  const stitchOffsets = [-r * 0.18, -r * 0.06, r * 0.06, r * 0.18]
  const stitchLen = r * 0.14
  stitchOffsets.forEach(ox => {
    ctx.beginPath()
    ctx.moveTo(cx + ox, cy - stitchLen)
    ctx.lineTo(cx + ox, cy + stitchLen)
    ctx.stroke()
  })
}

// ─── ICON 1024×1024 ────────────────────────────────────────────────────────

function generateIcon() {
  const S = 1024
  const canvas = createCanvas(S, S)
  const ctx = canvas.getContext('2d')

  // background
  ctx.fillStyle = '#f5f0e8'
  ctx.fillRect(0, 0, S, S)

  // border
  ctx.strokeStyle = '#e8e0d0'
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1)

  // bottom pitch perspective shape
  ctx.beginPath()
  ctx.moveTo(0, S)
  ctx.bezierCurveTo(S * 0.1, S * 0.72, S * 0.35, S * 0.62, S * 0.5, S * 0.6)
  ctx.bezierCurveTo(S * 0.65, S * 0.62, S * 0.9, S * 0.72, S, S)
  ctx.closePath()
  ctx.fillStyle = '#e8e0d0'
  ctx.fill()

  // cricket ball at 40% from top, r=180
  const cx = S / 2, cy = S * 0.40, r = 180
  drawBall(ctx, cx, cy, r)

  // CRICKET label
  ctx.save()
  ctx.font = 'bold 52px Arial'
  ctx.fillStyle = '#9a8a70'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.letterSpacing = '20px'
  ctx.fillText('C R I C K E T', S / 2, 660)
  ctx.restore()

  // divider line top
  ctx.beginPath()
  ctx.moveTo(200, 680)
  ctx.lineTo(824, 680)
  ctx.strokeStyle = '#e8e0d0'
  ctx.lineWidth = 1
  ctx.stroke()

  // wordmark row — T + ball + SSER at y=800
  const wordY = 800
  ctx.save()
  ctx.font = '220px Georgia, serif'
  ctx.fillStyle = '#1a3a1a'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('T', 160, wordY)
  ctx.restore()

  // ball replacing O — radius 88, centred at x=512, y=790
  drawBall(ctx, 512, 790, 88)

  ctx.save()
  ctx.font = '220px Georgia, serif'
  ctx.fillStyle = '#1a3a1a'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('SSER', 608, wordY)
  ctx.restore()

  // divider line bottom
  ctx.beginPath()
  ctx.moveTo(200, 870)
  ctx.lineTo(824, 870)
  ctx.strokeStyle = '#e8e0d0'
  ctx.lineWidth = 1
  ctx.stroke()

  // POWERED BY AI
  ctx.save()
  ctx.font = '36px Arial'
  ctx.fillStyle = '#9a8a70'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '12px'
  ctx.fillText('P O W E R E D   B Y   A I', S / 2, 920)
  ctx.restore()

  // AI badge
  ctx.beginPath()
  ctx.arc(700, 910, 28, 0, Math.PI * 2)
  ctx.strokeStyle = '#2d5a27'
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.save()
  ctx.font = 'bold 22px Arial'
  ctx.fillStyle = '#2d5a27'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('AI', 700, 910)
  ctx.restore()

  return canvas
}

// ─── SPLASH 1284×2778 ──────────────────────────────────────────────────────

function generateSplash() {
  const W = 1284, H = 2778
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // background
  ctx.fillStyle = '#f5f0e8'
  ctx.fillRect(0, 0, W, H)

  // bottom pitch triangle
  ctx.beginPath()
  ctx.moveTo(W / 2, H * 0.28)
  ctx.lineTo(0, H)
  ctx.lineTo(W, H)
  ctx.closePath()
  ctx.fillStyle = '#e8e0d0'
  ctx.fill()

  // center line on pitch
  ctx.beginPath()
  ctx.moveTo(W / 2, H * 0.28)
  ctx.lineTo(W / 2, H)
  ctx.strokeStyle = 'rgba(196,184,154,0.4)'
  ctx.lineWidth = 1
  ctx.stroke()

  // ball
  const cx = W / 2, cy = 900, r = 220
  drawBall(ctx, cx, cy, r)

  // CRICKET label
  ctx.save()
  ctx.font = 'bold 64px Arial'
  ctx.fillStyle = '#9a8a70'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.letterSpacing = '24px'
  ctx.fillText('C R I C K E T', W / 2, 1220)
  ctx.restore()

  // divider
  ctx.beginPath()
  ctx.moveTo(250, 1245)
  ctx.lineTo(W - 250, 1245)
  ctx.strokeStyle = '#e8e0d0'
  ctx.lineWidth = 1
  ctx.stroke()

  // wordmark T + ball + SSER
  const wordY = 1370
  ctx.save()
  ctx.font = '270px Georgia, serif'
  ctx.fillStyle = '#1a3a1a'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('T', 210, wordY)
  ctx.restore()

  drawBall(ctx, W / 2, 1360, 108)

  ctx.save()
  ctx.font = '270px Georgia, serif'
  ctx.fillStyle = '#1a3a1a'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('SSER', 660, wordY)
  ctx.restore()

  // divider
  ctx.beginPath()
  ctx.moveTo(250, 1480)
  ctx.lineTo(W - 250, 1480)
  ctx.strokeStyle = '#e8e0d0'
  ctx.lineWidth = 1
  ctx.stroke()

  // tagline
  ctx.save()
  ctx.font = '52px Arial'
  ctx.fillStyle = '#9a8a70'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '8px'
  ctx.fillText('Analyse. Predict. Win.', W / 2, 1550)
  ctx.restore()

  return canvas
}

// ─── write files ────────────────────────────────────────────────────────────

function save(canvas, filename) {
  const buf = canvas.toBuffer('image/png')
  fs.writeFileSync(path.join(OUT, filename), buf)
  console.log(`✓ ${filename} (${(buf.length / 1024).toFixed(0)} KB)`)
}

const icon = generateIcon()
save(icon, 'icon.png')

// adaptive-icon — same design
save(icon, 'adaptive-icon.png')

// splash
save(generateSplash(), 'splash.png')

// favicon 64×64 — scaled-down icon
const fav = createCanvas(64, 64)
const fctx = fav.getContext('2d')
fctx.drawImage(icon, 0, 0, 64, 64)
save(fav, 'favicon.png')

console.log('\nAll assets written to pitchreader/app/assets/')
