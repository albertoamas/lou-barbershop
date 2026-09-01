import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { Resvg } from '@resvg/resvg-js'

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url))
const source = await readFile(new URL('../public/icon.svg', import.meta.url))
const outputDirectory = new URL('../public/icons/', import.meta.url)

await mkdir(outputDirectory, { recursive: true })

for (const size of [192, 512]) {
  const renderer = new Resvg(source, {
    fitTo: { mode: 'width', value: size },
  })
  const outputPath = new URL(`icon-${size}.png`, outputDirectory)

  await writeFile(outputPath, renderer.render().asPng())
  console.log(`Generated ${fileURLToPath(outputPath)} from ${publicDirectory}icon.svg`)
}
