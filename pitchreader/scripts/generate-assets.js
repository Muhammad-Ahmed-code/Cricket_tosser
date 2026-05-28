'use strict'

const { createCanvas, loadImage } = require('canvas')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'app', 'assets')

function drawCircleBall(ctx, img, cx, cy, r) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  const scale = (r * 2) / Math.min(img.width, img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh)
  ctx.restore()
}

// ─── SPLASH 1284×2778 ──────────────────────────────────────────────────────

function generateSplash(ballImg) {
  const W = 1284, H = 2778
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#0f0f0f'
  ctx.fillRect(0, 0, W, H)

  // ball image centered at x=642, y=900, 700px wide
  const ballW = 700
  const ballH = ballImg.height * (ballW / ballImg.width)
  ctx.drawImage(ballImg, 642 - ballW / 2, 900 - ballH / 2, ballW, ballH)

  // CRICKET
  ctx.save()
  ctx.font = 'bold 60px Arial'
  ctx.fillStyle = '#7ec87e'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.letterSpacing = '28px'
  ctx.fillText('CRICKET', W / 2, 1220)
  ctx.restore()

  // divider
  ctx.beginPath()
  ctx.moveTo(250, 1255)
  ctx.lineTo(1034, 1255)
  ctx.strokeStyle = 'rgba(126,200,126,0.3)'
  ctx.lineWidth = 1
  ctx.stroke()

  // measure T and SSER for centered wordmark
  ctx.save()
  ctx.font = '240px Georgia, serif'
  const tW = ctx.measureText('T').width
  const sserW = ctx.measureText('SSER').width
  ctx.restore()

  const ballD = 100
  const gapW = 24
  const totalW = tW + gapW + ballD + gapW + sserW
  const startX = (W - totalW) / 2
  const wordY = 1380

  ctx.save()
  ctx.font = '240px Georgia, serif'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('T', startX, wordY)
  ctx.restore()

  drawCircleBall(ctx, ballImg, startX + tW + gapW + ballD / 2, wordY, ballD / 2)

  ctx.save()
  ctx.font = '240px Georgia, serif'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('SSER', startX + tW + gapW + ballD + gapW, wordY)
  ctx.restore()

  // divider
  ctx.beginPath()
  ctx.moveTo(250, 1440)
  ctx.lineTo(1034, 1440)
  ctx.strokeStyle = 'rgba(126,200,126,0.3)'
  ctx.lineWidth = 1
  ctx.stroke()

  // POWERED BY AI
  ctx.save()
  ctx.font = '48px Arial'
  ctx.fillStyle = '#7ec87e'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.letterSpacing = '14px'
  ctx.fillText('POWERED BY AI', W / 2, 1500)
  ctx.restore()

  // AI badge — right of POWERED BY AI text
  ctx.save()
  ctx.font = '48px Arial'
  ctx.letterSpacing = '0px'
  const pwBase = ctx.measureText('POWERED BY AI').width
  ctx.restore()
  // account for 12 inter-char gaps at 14px each
  const pwTotal = pwBase + 12 * 14
  const badgeCX = W / 2 + pwTotal / 2 + 48
  const badgeCY = 1484
  ctx.beginPath()
  ctx.arc(badgeCX, badgeCY, 28, 0, Math.PI * 2)
  ctx.strokeStyle = '#7ec87e'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.save()
  ctx.font = 'bold 20px Arial'
  ctx.fillStyle = '#7ec87e'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = '0px'
  ctx.fillText('AI', badgeCX, badgeCY)
  ctx.restore()

  // tagline
  ctx.save()
  ctx.font = '48px Arial'
  ctx.fillStyle = 'rgba(126,200,126,0.5)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.letterSpacing = '0px'
  ctx.fillText('Analyse. Predict. Win.', W / 2, 1640)
  ctx.restore()

  return canvas
}

// ─── ICON 1024×1024 ────────────────────────────────────────────────────────

function generateIcon(ballImg) {
  const S = 1024
  const canvas = createCanvas(S, S)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#0f0f0f'
  ctx.fillRect(0, 0, S, S)

  // ball image centered horizontally, upper area
  const ballW = 700
  const ballH = ballImg.height * (ballW / ballImg.width)
  const ballCY = Math.round(S * 0.4)
  ctx.drawImage(ballImg, S / 2 - ballW / 2, ballCY - ballH / 2, ballW, ballH)

  // CRICKET
  ctx.save()
  ctx.font = 'bold 48px Arial'
  ctx.fillStyle = '#7ec87e'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.letterSpacing = '20px'
  ctx.fillText('CRICKET', S / 2, 820)
  ctx.restore()

  // divider
  ctx.beginPath()
  ctx.moveTo(162, 845)
  ctx.lineTo(862, 845)
  ctx.strokeStyle = 'rgba(126,200,126,0.3)'
  ctx.lineWidth = 1
  ctx.stroke()

  // measure for centered wordmark
  ctx.save()
  ctx.font = '180px Georgia, serif'
  const tW = ctx.measureText('T').width
  const sserW = ctx.measureText('SSER').width
  ctx.restore()

  const ballD = 75
  const gapW = 18
  const totalW = tW + gapW + ballD + gapW + sserW
  const startX = (S - totalW) / 2
  const wordY = 950

  ctx.save()
  ctx.font = '180px Georgia, serif'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('T', startX, wordY)
  ctx.restore()

  drawCircleBall(ctx, ballImg, startX + tW + gapW + ballD / 2, wordY, ballD / 2)

  ctx.save()
  ctx.font = '180px Georgia, serif'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('SSER', startX + tW + gapW + ballD + gapW, wordY)
  ctx.restore()

  // divider
  ctx.beginPath()
  ctx.moveTo(162, 970)
  ctx.lineTo(862, 970)
  ctx.strokeStyle = 'rgba(126,200,126,0.3)'
  ctx.lineWidth = 1
  ctx.stroke()

  // POWERED BY AI
  ctx.save()
  ctx.font = '32px Arial'
  ctx.fillStyle = '#7ec87e'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.letterSpacing = '8px'
  ctx.fillText('POWERED BY AI', S / 2, 1008)
  ctx.restore()

  return canvas
}

// ─── FAVICON 64×64 ─────────────────────────────────────────────────────────

function generateFavicon(ballImg) {
  const S = 64
  const canvas = createCanvas(S, S)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#0f0f0f'
  ctx.fillRect(0, 0, S, S)

  const size = 56
  const scale = size / Math.max(ballImg.width, ballImg.height)
  const dw = ballImg.width * scale
  const dh = ballImg.height * scale
  ctx.drawImage(ballImg, (S - dw) / 2, (S - dh) / 2, dw, dh)

  return canvas
}

// ─── write files ────────────────────────────────────────────────────────────

function save(canvas, filename) {
  const buf = canvas.toBuffer('image/png')
  fs.writeFileSync(path.join(OUT, filename), buf)
  console.log(`✓ ${filename} (${(buf.length / 1024).toFixed(0)} KB)`)
}

async function main() {
  const ballImg = await loadImage(path.join(OUT, 'cricket-ball.png'))
  console.log(`Loaded cricket-ball.png: ${ballImg.width}x${ballImg.height}`)

  const icon = generateIcon(ballImg)
  save(icon, 'icon.png')
  save(icon, 'adaptive-icon.png')

  save(generateSplash(ballImg), 'splash.png')
  save(generateFavicon(ballImg), 'favicon.png')

  console.log('\nAll assets written to pitchreader/app/assets/')
}

main().catch(console.error)
