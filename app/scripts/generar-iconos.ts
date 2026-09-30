// Genera los PNG y el favicon a partir de public/icons/icon.svg. Uso: pnpm iconos
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const svg = readFileSync('public/icons/icon.svg', 'utf8')

// Zona segura maskable: círculo centrado de radio 40 % del lado.
// Se rasteriza solo el dibujo (sin el fondo) y se exige alfa 0 fuera del círculo.
const soloDibujo = Buffer.from(svg.replace(/<rect id="fondo"[^>]*\/>/, ''))
const { data, info } = await sharp(soloDibujo).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
const centro = info.width / 2
const radio = info.width * 0.4
let fuera = 0
let dentro = 0
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] === 0) continue
    dentro++
    if (Math.hypot(x + 0.5 - centro, y + 0.5 - centro) > radio) fuera++
  }
}
if (dentro === 0 || fuera > 0) {
  console.error(`Zona segura: ${fuera} píxeles fuera del círculo`)
  process.exit(1)
}
console.log(`Zona segura OK (${dentro} píxeles del dibujo, 0 fuera)`)

for (const [archivo, lado] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
] as const) {
  await sharp(Buffer.from(svg), { density: (72 * lado) / 512 }).resize(lado, lado).png().toFile(`public/icons/${archivo}`)
}
writeFileSync('public/favicon.svg', svg)
console.log('Íconos generados en public/icons')
