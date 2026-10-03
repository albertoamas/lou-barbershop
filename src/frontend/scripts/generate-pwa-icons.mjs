import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { Resvg } from '@resvg/resvg-js'

// The official logo is only available as a 1080x1080 JPG on black. Icons are square
// crops of that file (never a redrawing), framed with an SVG viewBox and rasterized.
const LOGO_SIZE = 1080
const logoPath = new URL('../public/brand/lou-logo.jpg', import.meta.url)
const outputDirectory = new URL('../public/icons/', import.meta.url)

// Crops in logo pixels: [x, y, side].
const fullLogo = [170, 168, 740]
const maskableLogo = [68, 66, 944] // full logo inside the 80% maskable safe zone
const razorsOnly = [260, 165, 560] // favicon: text is unreadable at 48 px

const icons = [
  { file: 'icon-192.png', size: 192, crop: fullLogo },
  { file: 'icon-512.png', size: 512, crop: fullLogo },
  { file: 'icon-maskable-512.png', size: 512, crop: maskableLogo },
  { file: 'apple-touch-icon-180.png', size: 180, crop: maskableLogo },
  { file: 'favicon-48.png', size: 48, crop: razorsOnly },
]

const logo = (await readFile(logoPath)).toString('base64')

await mkdir(outputDirectory, { recursive: true })

for (const { file, size, crop } of icons) {
  const [x, y, side] = crop
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${side} ${side}">
  <rect x="0" y="0" width="${LOGO_SIZE}" height="${LOGO_SIZE}" fill="#000000"/>
  <image href="data:image/jpeg;base64,${logo}" width="${LOGO_SIZE}" height="${LOGO_SIZE}"/>
</svg>`
  const renderer = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
  const outputPath = new URL(file, outputDirectory)

  await writeFile(outputPath, renderer.render().asPng())
  console.log(`Generated ${fileURLToPath(outputPath)}`)
}
