import { Resvg, initWasm } from "@resvg/resvg-wasm"
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm"
import { encode as encodeJpeg } from "jpeg-js"
import { env } from "cloudflare:workers"
import heeboBold from "@/fonts/Heebo-Bold.otf?inline"
import heeboMedium from "@/fonts/Heebo-Medium.otf?inline"
import { stationOgImage, type Station } from "@/data/stations"
import { escapeXml, heroSvg, type HeroContent, type Measure } from "./hero"

/**
 * Rasterises the hero image on the Worker: resvg (WebAssembly) draws the SVG, jpeg-js encodes the pixels. Both run
 * anywhere with WebAssembly and no native code, which is what Workers allow. The wasm is imported as a compiled
 * module — Workers refuse to compile wasm at runtime — and the fonts are inlined into the bundle, so a cold isolate
 * needs nothing but the station photo, which it reads from the static assets.
 */

const JPEG_QUALITY = 82

const fromDataUri = (uri: string) => Uint8Array.from(atob(uri.slice(uri.indexOf(",") + 1)), (char) => char.charCodeAt(0))

let fonts: { fontBuffers: Uint8Array[]; loadSystemFonts: false; defaultFontFamily: string } | undefined
const fontOptions = () =>
  (fonts ??= {
    fontBuffers: [fromDataUri(heeboBold), fromDataUri(heeboMedium)],
    loadSystemFonts: false,
    defaultFontFamily: "Heebo",
  })

// `initWasm` may only run once per isolate; a rejected attempt is dropped so the next request can retry.
let ready: Promise<void> | undefined
const init = () =>
  (ready ??= initWasm(resvgWasm).catch((error) => {
    ready = undefined
    throw error
  }))

const measure: Measure = (text, size, weight) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="400"><text x="100" y="200" font-family="Heebo" font-weight="${weight}" font-size="${size}">${escapeXml(text)}</text></svg>`
  return new Resvg(svg, { font: fontOptions() }).getBBox()?.width ?? 0
}

export async function renderHeroJpeg(content: HeroContent): Promise<Uint8Array<ArrayBuffer>> {
  await init()
  const image = new Resvg(heroSvg(content, measure), { font: fontOptions() }).render()
  // Copied out of jpeg-js's (possibly pooled) buffer into one the Response owns.
  return new Uint8Array(encodeJpeg({ data: image.pixels, width: image.width, height: image.height }, JPEG_QUALITY).data)
}

/** A file from the site's static assets: through the Worker's assets binding, or over HTTP where there is none (`vite dev`). */
async function fetchAsset(path: string, request: Request): Promise<Response> {
  const url = new URL(path, request.url)
  return env.ASSETS ? env.ASSETS.fetch(new Request(url)) : fetch(url)
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64")
  let binary = ""
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

/** The station's 1200×630 Open Graph photo as a `data:` URI the SVG can embed, or nothing when it has no photo. */
export async function stationPhotoDataUri(station: Station, request: Request): Promise<string | undefined> {
  const path = stationOgImage(station)
  if (!path) return undefined
  try {
    const response = await fetchAsset(path, request)
    if (!response.ok) return undefined
    return `data:image/jpeg;base64,${toBase64(new Uint8Array(await response.arrayBuffer()))}`
  } catch {
    return undefined
  }
}
