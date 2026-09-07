// Renders the store QR codes shown in the header's "Get the app" popover into public/assets/images/qr.
// Runs before dev/build; outputs are gitignored and re-rendered whenever the store URLs change.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import QRCode from "qrcode"
import { APP_STORE_URL, PLAY_STORE_URL } from "../src/lib/seo.ts"

const target = resolve(import.meta.dir, "../public/assets/images/qr")
mkdirSync(target, { recursive: true })

// Black modules on a transparent background: the popover always frames them in white, which scanners need.
// The logo in the middle costs us modules, so the codes are cut at the highest error correction level (30%).
const options = { type: "svg", margin: 0, errorCorrectionLevel: "H", color: { dark: "#000000ff", light: "#00000000" } } as const

/** Side of the knocked-out square as a fraction of the code's width — ~7% of its area, well inside what "H" recovers. */
const KNOCKOUT = 0.27
/**
 * Side of the box the logo is fitted into, measured against the code rather than against the knockout: the two
 * URLs need different QR versions (41 and 45 modules), so their knockouts snap to different fractions of the
 * width, and only measuring from the code itself renders both logos at the same size on the page. Each is
 * cropped to its ink in `qr-logos` and fitted by its longer side — the App Store glyph is 24 x 21.9 and the Play
 * mark 272 x 300, so each fills the box one way and ~0.91 of it the other.
 */
const LOGO = 0.18

/**
 * Drops a store logo into the middle of a generated code: a white square knocked out of the modules, with the
 * logo centred inside it. The square is snapped to whole modules so its edges land on the grid rather than
 * slicing through a row of dots.
 */
function embedLogo(svg: string, logoPath: string): string {
  const size = Number(svg.match(/viewBox="0 0 (\d+)/)?.[1])
  const logo = readFileSync(logoPath, "utf8")
  const [x, y, width, height] = logo
    .match(/viewBox="([^"]+)"/)![1]
    .split(/\s+/)
    .map(Number)
  const inner = logo.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")

  // Module counts are always odd, so an odd square centres on whole modules.
  const knockout = Math.round(size * KNOCKOUT) | 1
  const offset = (size - knockout) / 2
  const scale = (size * LOGO) / Math.max(width, height)
  const left = (size - width * scale) / 2 - x * scale
  const top = (size - height * scale) / 2 - y * scale

  const overlay =
    `<rect x="${offset}" y="${offset}" width="${knockout}" height="${knockout}" rx="${(knockout * 0.16).toFixed(3)}" fill="#fff"/>` +
    // The code itself is drawn with crispEdges, which would leave the logo's curves jagged.
    `<g transform="translate(${left.toFixed(3)} ${top.toFixed(3)}) scale(${scale.toFixed(5)})" shape-rendering="geometricPrecision">${inner}</g>`

  return svg.replace("</svg>", `${overlay}</svg>`)
}

for (const [name, url, logo] of [
  ["app-store", APP_STORE_URL, "app-store.svg"],
  ["play-store", PLAY_STORE_URL, "google-play.svg"],
] as const) {
  const svg = await QRCode.toString(url, options)
  writeFileSync(resolve(target, `${name}.svg`), embedLogo(svg, resolve(import.meta.dir, "qr-logos", logo)))
}

console.log("qr codes: 2 files written to public/assets/images/qr")
