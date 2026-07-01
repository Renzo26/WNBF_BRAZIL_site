import sharp from 'sharp'
import { readFile, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(process.cwd())

// Fotos das categorias: exibidas em cards de no máx ~34vw / 460px de altura.
// 1080px de largura cobre telas retina sem exagero. WebP q72 dá ótimo peso/qualidade.
const cards = ['body', 'MensV2', 'Classic', 'Bikini', 'Figure', 'Welness']

async function toWebp(src, dest, { width, quality }) {
  const before = (await stat(src)).size
  await sharp(src)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toFile(dest)
  const after = (await stat(dest)).size
  const kb = (n) => (n / 1024).toFixed(0) + ' KB'
  console.log(`${path.basename(dest)}: ${kb(before)} -> ${kb(after)}  (-${(100 - (after / before) * 100).toFixed(0)}%)`)
}

for (const name of cards) {
  await toWebp(
    path.join(root, 'assets-src/atletas', `${name}.jpg`),
    path.join(root, 'public/atletas', `${name}.webp`),
    { width: 1080, quality: 72 },
  )
}

// Logo do rodapé (exibido a ~h-14 => ~56px de altura; 400px de largura sobra).
await toWebp(
  path.join(root, 'assets-src/brand', 'wnbf-brazil.png'),
  path.join(root, 'public/brand', 'wnbf-brazil.webp'),
  { width: 400, quality: 82 },
)

console.log('OK')
