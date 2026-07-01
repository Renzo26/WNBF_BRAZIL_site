import { execFileSync } from 'node:child_process'
import { statSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import ffmpeg from 'ffmpeg-static'
import sharp from 'sharp'

// Reprocessa o vídeo do hero a partir do original preservado em assets-src/.
// Estratégia: poster (primeiro frame, alta qualidade) aparece de imediato e o
// vídeo carrega depois (preload="none" + play no window.load).
const root = path.resolve(process.cwd())
const src = path.join(root, 'assets-src/video/hero.mp4')
const outMp4 = path.join(root, 'public/video/hero.mp4')
const framePng = path.join(root, 'public/video/_frame0.png')
const posterWebp = path.join(root, 'public/video/hero-poster.webp')

const mb = (p) => (statSync(p).size / 1048576).toFixed(2) + ' MB'
const kb = (p) => Math.round(statSync(p).size / 1024) + ' KB'

// 1) Poster = primeiro frame em 1080p
execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-frames:v', '1', '-q:v', '2', framePng])
await sharp(framePng).webp({ quality: 82, effort: 6 }).toFile(posterWebp)
unlinkSync(framePng)
console.log('poster:', kb(posterWebp))

// 2) Vídeo 1080p, CRF 24 (qualidade alta), sem áudio, faststart
execFileSync(ffmpeg, [
  '-hide_banner', '-loglevel', 'error', '-y', '-i', src,
  '-an', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  '-crf', '24', '-preset', 'slow', '-movflags', '+faststart',
  outMp4,
])
console.log('hero.mp4:', mb(outMp4))
