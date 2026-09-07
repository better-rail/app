// Renders the web copies (640/1280 WebP + 1200x630 OG JPEG) of packages/stations/images into public/stations.
// Runs before dev/build; outputs are gitignored and only re-rendered when the source photo is newer.
import { mkdirSync, readdirSync, statSync } from "node:fs"
import { resolve } from "node:path"
import sharp from "sharp"

const source = resolve(import.meta.dir, "../../../packages/stations/images")
const target = resolve(import.meta.dir, "../public/stations")
mkdirSync(resolve(target, "og"), { recursive: true })

const isStale = (input: string, output: string) => {
  try {
    return statSync(output).mtimeMs < statSync(input).mtimeMs
  } catch {
    return true
  }
}

const files = readdirSync(source).filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
let written = 0

await Promise.all(
  files.map(async (file) => {
    const input = resolve(source, file)
    const key = file.replace(/\.[^.]+$/, "")
    const outputs = [
      { path: resolve(target, `${key}-640.webp`), render: () => sharp(input).resize({ width: 640 }).webp({ quality: 78 }) },
      {
        path: resolve(target, `${key}-1280.webp`),
        render: () => sharp(input).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 76 }),
      },
      {
        path: resolve(target, "og", `${key}.jpg`),
        render: () =>
          sharp(input)
            .resize({ width: 1200, height: 630, fit: "cover", position: "attention" })
            .jpeg({ quality: 80, mozjpeg: true }),
      },
    ]
    for (const output of outputs) {
      if (!isStale(input, output.path)) continue
      await output.render().toFile(output.path)
      written++
    }
  }),
)

console.log(`station images: ${files.length} sources, ${written} files written to public/stations`)
