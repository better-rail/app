/**
 * Renders the Service Status map model to an SVG so the layout in
 * src/data/rail-map-layout.ts can be checked without a device:
 *
 *   bun run --loader=.jpg:file --loader=.jpeg:file --loader=.png:file --loader=.webp:file \
 *     scripts/rail-map-preview.ts /tmp/rail-map.svg [he|en|ru|ar] [weekday|weekend|night] [light|dark]
 *
 * (The loaders let Bun import the station list, which requires station photos.)
 *
 * The SVG is drawn at 10 px per map unit. The app draws the same model with
 * Skia (src/components/rail-map/rail-map.tsx); this mirrors its drawing order
 * and measurements, with the browser's line wrapping approximated by width.
 * Rasterise it with headless Chrome to see the Heebo names:
 *
 *   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
 *     --hide-scrollbars --screenshot=/tmp/rail-map.png --window-size=1100,3500 file:///tmp/rail-map.html
 */
import {
  CAPSULE_RING,
  CAPSULE_WIDTH,
  CITY_FONT_SIZE,
  FRAME_RADIUS,
  FRAME_STROKE,
  type DayType,
  LABEL_LINE_HEIGHT,
  LINE_CASING,
  LINE_STROKE,
  TERMINAL_DOT_RADIUS,
  TICK_WIDTH,
  buildRailMapModel,
  isRtlScript,
  mapStationName,
  nameFontSize,
  placeLabels,
  tickFor,
} from "@/components/rail-map/rail-map-model"
import { RAIL_MAP_PALETTE } from "@/components/rail-map/rail-map-theme"
import { MAP_NAME_OVERRIDES } from "@/data/rail-map-layout"
import { setStationLocale, stationName } from "@/data/stations"

const out = process.argv[2] ?? "/tmp/rail-map.svg"
const locale = (process.argv[3] ?? "en") as "he" | "en" | "ru" | "ar"
const dayType = (process.argv[4] ?? "weekday") as DayType
const scheme = (process.argv[5] ?? "light") as "light" | "dark"
const palette = RAIL_MAP_PALETTE[scheme]
const m = buildRailMapModel(dayType)
const S = 10

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")
const px = (n: number) => (Math.round(n * S * 100) / 100).toString()

setStationLocale(locale)
const name = (stationId: string, stationNameOnly: boolean): string =>
  mapStationName(MAP_NAME_OVERRIDES[stationId]?.[locale] ?? stationName(stationId), stationNameOnly)

/** Roughly how wide a run of text is, in map units, at `size`. */
const textWidth = (text: string, size: number) => text.length * size * (isRtlScript(text) ? 0.5 : 0.52)

/** Wraps at spaces to `maxWidth`, dropping a dash between two parts as the app does. */
const wrap = (text: string, size: number, maxWidth: number): string[] => {
  if (textWidth(text, size) <= maxWidth) return [text]
  const parts = text.split(/\s+[-–]\s+/)
  const words = (parts.length > 1 ? parts.join(" \n ") : text).split(/\s+/)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    if (word === "\n") {
      lines.push(current)
      current = ""
      continue
    }
    const next = current ? `${current} ${word}` : word
    if (textWidth(next, size) > maxWidth && current) {
      lines.push(current)
      current = word
    } else current = next
  }
  if (current) lines.push(current)
  return lines
}

// The names' places, measured as the browser roughly will.
const placement = placeLabels(m, (stationId, maxWidth) => {
  const request = m.labels.find((l) => l.stationId === stationId)
  const text = name(stationId, request?.stationNameOnly ?? false)
  const size = nameFontSize(text)
  const lines = wrap(text, size, maxWidth)
  return { width: Math.max(...lines.map((l) => textWidth(l, size))), height: lines.length * size * LABEL_LINE_HEIGHT }
})
const sideOf = new Map(placement.labels.map((l) => [l.stationId, l.side]))

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px(m.bounds.width)}" height="${px(m.bounds.height)}" viewBox="0 0 ${m.bounds.width} ${m.bounds.height}" font-family="Heebo">`
svg += `<rect width="100%" height="100%" fill="${palette.background}"/>`
for (const f of placement.frames) {
  svg += `<rect x="${f.box.left}" y="${f.box.top}" width="${f.box.right - f.box.left}" height="${f.box.bottom - f.box.top}" rx="${FRAME_RADIUS}" fill="none" stroke="${palette.frame}" stroke-width="${FRAME_STROKE}"/>`
}

const stroke = (d: string, color: string, width: number) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`
for (const line of m.lines) svg += stroke(line.d, palette.background, LINE_CASING)
for (const line of m.lines) svg += stroke(line.d, line.line.color, LINE_STROKE)

for (const mark of m.marks) {
  if (mark.lone) {
    const tick = tickFor(mark, sideOf.get(mark.stationId) ?? "left")
    svg += `<line x1="${tick.from.x}" y1="${tick.from.y}" x2="${tick.to.x}" y2="${tick.to.y}" stroke="${palette.marker}" stroke-width="${TICK_WIDTH}" stroke-linecap="butt"/>`
  }
  for (const c of mark.capsules) {
    const seg = (w: number, color: string) =>
      `<line x1="${c.from.x}" y1="${c.from.y}" x2="${c.to.x}" y2="${c.to.y}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`
    svg += seg(CAPSULE_WIDTH, palette.marker) + seg(CAPSULE_WIDTH - CAPSULE_RING * 2, palette.markerFill)
  }
  for (const p of mark.irregular) {
    svg += `<circle cx="${p.x}" cy="${p.y}" r="${(CAPSULE_WIDTH - CAPSULE_RING) / 2}" fill="${palette.markerFill}" stroke="${palette.dimInk}" stroke-width="${CAPSULE_RING}"/>`
  }
  for (const p of mark.terminals) svg += `<circle cx="${p.x}" cy="${p.y}" r="${TERMINAL_DOT_RADIUS}" fill="${palette.marker}"/>`
}

for (const label of placement.labels) {
  const text = name(label.stationId, label.stationNameOnly)
  const size = nameFontSize(text)
  const lines = wrap(text, size, label.maxWidth)
  const lineHeight = size * LABEL_LINE_HEIGHT
  const rtl = isRtlScript(text)
  // SVG anchors swap ends for right-to-left text.
  const anchor = label.side === "left" ? (rtl ? "start" : "end") : label.side === "right" ? (rtl ? "end" : "start") : "middle"
  const height = lines.length * lineHeight
  let top =
    label.side === "above" ? label.anchor.y - height : label.side === "below" ? label.anchor.y : label.anchor.y - height / 2
  for (const l of lines) {
    const y = top + size * 0.78
    svg += `<text x="${label.anchor.x}" y="${y}" font-size="${size}" font-weight="500" fill="${palette.ink}" text-anchor="${anchor}" direction="${rtl ? "rtl" : "ltr"}">${esc(l)}</text>`
    top += lineHeight
  }
}

for (const f of placement.frames) {
  const text = f.name[locale]
  const size = CITY_FONT_SIZE * (isRtlScript(text) ? 1 : 0.85)
  // The caption's left edge is at the anchor: for right-to-left text that is its end.
  svg += `<text x="${f.caption.x}" y="${f.caption.y}" font-size="${size}" font-weight="500" fill="${palette.cityInk}" text-anchor="${isRtlScript(text) ? "end" : "start"}" direction="${isRtlScript(text) ? "rtl" : "ltr"}">${esc(text)}</text>`
}
svg += `</svg>`

await Bun.write(out, svg)
const html = `<html><head><meta charset="utf-8"><style>@font-face{font-family:Heebo;src:url("file://${import.meta.dir}/../assets/fonts/Heebo-Medium.otf");font-weight:500}@font-face{font-family:Heebo;src:url("file://${import.meta.dir}/../assets/fonts/Heebo-Regular.otf");font-weight:400}@font-face{font-family:Heebo;src:url("file://${import.meta.dir}/../assets/fonts/Heebo-Medium.otf");font-weight:700}body{margin:0}</style></head><body>${svg}</body></html>`
await Bun.write(out.replace(/\.svg$/, ".html"), html)
console.log(
  "lines",
  m.lines.length,
  "marks",
  m.marks.length,
  "labels",
  m.labels.length,
  "size",
  px(m.bounds.width),
  px(m.bounds.height),
)
