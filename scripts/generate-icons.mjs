// Genera todos los íconos PWA/favicon a partir del logo MisanRD.png
// Uso: npm run icons
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const SRC = path.join(root, 'MisanRD.png')
const OUT = path.join(root, 'public', 'icons')

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }

async function main() {
  await mkdir(OUT, { recursive: true })

  // Íconos cuadrados "any" (con fondo blanco, el logo tiene fondo blanco)
  const square = [
    { size: 192, name: 'pwa-192.png' },
    { size: 512, name: 'pwa-512.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 32, name: 'favicon-32.png' },
    { size: 16, name: 'favicon-16.png' },
  ]

  for (const { size, name } of square) {
    await sharp(SRC)
      .resize(size, size, { fit: 'contain', background: WHITE })
      .flatten({ background: WHITE })
      .png()
      .toFile(path.join(OUT, name))
    console.log('✓', name)
  }

  // Ícono "maskable": el logo con padding para que la zona segura no se recorte.
  const padded = Math.round(512 * 0.72)
  await sharp(SRC)
    .resize(padded, padded, { fit: 'contain', background: WHITE })
    .extend({
      top: Math.round((512 - padded) / 2),
      bottom: Math.round((512 - padded) / 2),
      left: Math.round((512 - padded) / 2),
      right: Math.round((512 - padded) / 2),
      background: WHITE,
    })
    .flatten({ background: WHITE })
    .png()
    .toFile(path.join(OUT, 'pwa-maskable-512.png'))
  console.log('✓ pwa-maskable-512.png')

  // favicon.ico (multi-size) en la raíz de public
  await sharp(SRC)
    .resize(48, 48, { fit: 'contain', background: WHITE })
    .flatten({ background: WHITE })
    .toFile(path.join(root, 'public', 'favicon.ico'))
    .catch(async () => {
      // sharp no siempre escribe .ico; usamos png como fallback con el mismo nombre
      await sharp(SRC)
        .resize(48, 48, { fit: 'contain', background: WHITE })
        .flatten({ background: WHITE })
        .png()
        .toFile(path.join(root, 'public', 'favicon.ico'))
    })
  console.log('✓ favicon.ico')

  // Logo optimizado para usar dentro de la app (transparente, ancho fijo)
  await sharp(SRC)
    .resize(512, 512, { fit: 'inside' })
    .png()
    .toFile(path.join(root, 'public', 'logo.png'))
  console.log('✓ logo.png')

  console.log('\nÍconos generados en public/icons ✅')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
