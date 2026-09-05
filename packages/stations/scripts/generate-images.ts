// Regenerates src/images.ts: a static require() map so Metro can bundle the photos.
// Run after adding or renaming a photo: bun run --filter @better-rail/stations generate:images
import { readdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const imagesDir = resolve(import.meta.dir, "../images")
const target = resolve(import.meta.dir, "../src/images.ts")

const files = readdirSync(imagesDir)
  .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
  .sort()

const entries = files.map((file) => `  "${file.replace(/\.[^.]+$/, "")}": require("../images/${file}"),`)

writeFileSync(
  target,
  `// GENERATED FILE — run \`bun run --filter @better-rail/stations generate:images\` after changing the images folder.
/* eslint-disable @typescript-eslint/no-require-imports */

/** Bundled station photos keyed by \`Station.image\`, for React Native only (web derives its own copies). */
export const stationImages: Record<string, number> = {
${entries.join("\n")}
}
`,
)
console.log(`Wrote ${files.length} images to ${target}`)
