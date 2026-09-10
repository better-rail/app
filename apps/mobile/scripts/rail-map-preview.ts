/**
 * Renders the Service Status map model to an SVG so the traced geometry in
 * src/data/rail-map-layout.ts can be checked against the original artwork
 * without a device:
 *
 *   bun run --loader=.jpg:file --loader=.jpeg:file --loader=.png:file --loader=.webp:file \
 *     scripts/rail-map-preview.ts /tmp/rail-map.svg [he|en]
 *
 * (The loaders let Bun import the station list, which requires station photos.)
 *
 * The SVG is 913 × 2576, the original's pixel frame, so it can be laid over
 * the artwork. The app draws the same model with Skia
 * (src/components/rail-map/rail-map.tsx); this mirrors its drawing order and
 * measurements, with the browser's line wrapping approximated by width.
 */
import {
  BADGE_SIZE,
  CITY_BOX_RADIUS,
  CITY_BOX_STROKE,
  CITY_FONT_SIZE,
  IRREGULAR_STOP_STROKE,
  IRREGULAR_STRIPE_WIDTH,
  LABEL_LINE_HEIGHT,
  LATIN_SCALE,
  LINE_STROKE,
  MARKER_RADIUS,
  TERMINAL_RING_RADIUS,
  buildRailMapModel,
  isRtlScript,
  mapStationName,
  nameFontSize,
} from "@/components/rail-map/rail-map-model"
import { RAIL_MAP_PALETTE } from "@/components/rail-map/rail-map-theme"
import { LABEL_TEXT_OVERRIDES } from "@/data/rail-map-layout"
import { stationsObject } from "@/data/stations"

const lang = (process.argv[3] ?? "he") as "he" | "en"
const palette = RAIL_MAP_PALETTE.light
const m = buildRailMapModel()
const S = 9.13
const W = m.bounds.width * S
const H = m.bounds.height * S
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
const PLANE_D =
  "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"

/** Rough Heebo advance widths, in em, for wrapping: Hebrew letters are narrow, Latin capitals wide. */
const textWidth = (text: string, size: number): number => {
  let w = 0
  for (const ch of text) {
    if (ch === " ") w += 0.24
    else if (/[֐-׿]/.test(ch)) w += 0.5
    else if (/[A-Z]/.test(ch)) w += 0.66
    else if (/[a-z0-9]/.test(ch)) w += 0.52
    else w += 0.3
  }
  return w * size
}

const wrap = (text: string, size: number, maxWidth: number): string[] => {
  // A two-part name that does not fit is set as two lines without the dash, as in the app.
  if (/\s[-–]\s/.test(text) && textWidth(text, size) > maxWidth) {
    return text.split(/\s+[-–]\s+/).flatMap((part) => wrap(part, size, maxWidth))
  }
  const words = text.split(" ")
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (current && textWidth(next, size) > maxWidth) {
      lines.push(current)
      current = word
    } else current = next
  }
  if (current) lines.push(current)
  return lines
}
/** Heebo's natural line height is about 1.47 em; the app tightens it to LABEL_LINE_HEIGHT × size. */
const lineHeight = (size: number) => size * LABEL_LINE_HEIGHT * 1.08

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${m.bounds.width} ${m.bounds.height}" font-family="Heebo, Arial, sans-serif">`
svg += `<rect width="${m.bounds.width}" height="${m.bounds.height}" fill="${palette.background}"/>`

for (const city of m.cities) {
  svg += `<rect x="${city.x}" y="${city.y}" width="${city.width}" height="${city.height}" rx="${CITY_BOX_RADIUS}" fill="none" stroke="${palette.frame}" stroke-width="${CITY_BOX_STROKE}"/>`
}
for (const l of m.lines) {
  svg += `<path d="${l.d}" fill="none" stroke="${l.line.color}" stroke-width="${LINE_STROKE}" stroke-linecap="round" stroke-linejoin="round"/>`
}
for (const s of m.irregular) {
  svg += `<path d="${s.d}" fill="none" stroke="${palette.background}" stroke-width="${IRREGULAR_STRIPE_WIDTH}" stroke-linecap="butt"/>`
}
for (const mk of m.markers) {
  const { x, y } = mk.point
  if (mk.kind === "irregular") {
    svg += `<circle cx="${x}" cy="${y}" r="${MARKER_RADIUS - IRREGULAR_STOP_STROKE / 2}" fill="none" stroke="${palette.dot}" stroke-width="${IRREGULAR_STOP_STROKE}"/>`
    continue
  }
  if (mk.kind === "terminal") svg += `<circle cx="${x}" cy="${y}" r="${TERMINAL_RING_RADIUS}" fill="${palette.background}"/>`
  svg += `<circle cx="${x}" cy="${y}" r="${MARKER_RADIUS}" fill="${palette.dot}"/>`
}
for (const b of m.badges) {
  const outline = b.line.badgeStyle === "outline"
  const x = b.center.x - BADGE_SIZE.width / 2
  const y = b.center.y - BADGE_SIZE.height / 2
  svg += `<rect x="${x}" y="${y}" width="${BADGE_SIZE.width}" height="${BADGE_SIZE.height}" rx="${BADGE_SIZE.radius}" fill="${outline ? palette.background : b.line.color}" stroke="${b.line.color}" stroke-width="${outline ? 0.16 : 0}"/>`
  svg += `<text x="${b.center.x}" y="${b.center.y + BADGE_SIZE.fontSize * 0.36}" text-anchor="middle" font-size="${BADGE_SIZE.fontSize}" font-weight="500" fill="${outline ? b.line.color : b.line.textColor}">${b.line.badge}</text>`
}

const drawLines = (lines: string[], size: number, color: string, x: number, top: number, anchor: "start" | "middle" | "end") => {
  let y = top
  for (const line of lines) {
    const lh = lineHeight(size)
    svg += `<text x="${x}" y="${y + lh * 0.8}" text-anchor="${anchor}" font-size="${size}" font-weight="500" fill="${color}">${esc(line)}</text>`
    y += lh
  }
}

let airportTop = m.airport.y
for (const lb of m.labels) {
  const station = stationsObject[lb.stationId]
  const names = { he: station?.hebrew ?? lb.stationId, en: station?.english ?? lb.stationId }
  const name = mapStationName(LABEL_TEXT_OVERRIDES[lb.stationId]?.[lang] ?? names[lang], lb.stationNameOnly)
  const size = nameFontSize(lb.size, name)
  const lines = wrap(name, size, lb.maxWidth)
  const height = lines.length * lineHeight(size)
  const anchor = lb.side === "left" ? "end" : lb.side === "right" ? "start" : "middle"
  const top = lb.side === "above" ? lb.anchor.y - height : lb.side === "below" ? lb.anchor.y : lb.anchor.y - height / 2
  if (lb.stationId === "8600") airportTop = top
  drawLines(lines, size, palette.ink, lb.anchor.x, top, anchor)
}
for (const city of m.cities) {
  const name = city.name[lang]
  const size = CITY_FONT_SIZE * (isRtlScript(name) ? 1 : LATIN_SCALE)
  drawLines([name], size, palette.cityInk, city.labelX, city.labelY - lineHeight(size), "start")
}
{
  const s = m.airport.height / 20
  svg += `<path d="${PLANE_D}" transform="translate(${m.airport.x - 12 * s} ${airportTop - 0.3 - 22 * s}) scale(${s})" fill="${palette.cityInk}"/>`
}
svg += `</svg>`
await Bun.write(process.argv[2] ?? "/tmp/rail-map.svg", svg)
console.log("lines", m.lines.length, "markers", m.markers.length, "labels", m.labels.length, "badges", m.badges.length)
