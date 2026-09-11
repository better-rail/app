/**
 * Renders the Service Status map model to an SVG so the traced geometry in
 * src/data/rail-map-layout.ts can be checked against the original artwork
 * without a device:
 *
 *   bun run --loader=.jpg:file --loader=.jpeg:file --loader=.png:file --loader=.webp:file \
 *     scripts/rail-map-preview.ts /tmp/rail-map.svg [he|en] [weekday|weekend]
 *
 * (The loaders let Bun import the station list, which requires station photos.)
 *
 * The SVG is 913 × 2576, the original's pixel frame, so it can be laid over
 * the artwork. The app draws the same model with Skia
 * (src/components/rail-map/rail-map.tsx); this mirrors its drawing order and
 * measurements, with the browser's line wrapping approximated by width.
 */
import {
  CITY_BOX_RADIUS,
  CITY_BOX_STROKE,
  CITY_FONT_SIZE,
  IRREGULAR_STOP_STROKE,
  IRREGULAR_STRIPE_WIDTH,
  LABEL_LINE_HEIGHT,
  LAKE_HALO,
  LATIN_SCALE,
  LINE_CASING,
  LINE_DRAW_ORDER,
  LINE_STROKE,
  MARKER_RADIUS,
  SEA_FADE_STOPS,
  SHORE_WIDTH,
  TERMINAL_RING_RADIUS,
  TERMINAL_RING_WIDTH,
  type DayType,
  buildRailMapModel,
  isRtlScript,
  mapStationName,
  nameFontSize,
} from "@/components/rail-map/rail-map-model"
import { RAIL_MAP_PALETTE, paleColor } from "@/components/rail-map/rail-map-theme"
import { LABEL_TEXT_OVERRIDES } from "@/data/rail-map-layout"
import { stationsObject } from "@/data/stations"

const lang = (process.argv[3] ?? "he") as "he" | "en"
const dayType = (process.argv[4] ?? "weekday") as DayType
const palette = RAIL_MAP_PALETTE.light
const m = buildRailMapModel(dayType)
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

// The sea in bands along the coast, each with the fade's gradient laid along its horizontal distance from the coast.
const stops = SEA_FADE_STOPS.positions
  .map(
    (pos, i) =>
      `<stop offset="${pos}" stop-color="${paleColor(palette.sea, palette.background, 1 - SEA_FADE_STOPS.opacities[i])}"/>`,
  )
  .join("")
svg += `<defs>${m.water.bands.map((b, i) => `<linearGradient id="sea${i}" x1="${b.start.x}" y1="${b.start.y}" x2="${b.end.x}" y2="${b.end.y}" gradientUnits="userSpaceOnUse">${stops}</linearGradient>`).join("")}</defs>`
for (const [i, b] of m.water.bands.entries()) svg += `<path d="${b.d}" fill="url(#sea${i})"/>`
// The lakes: the halo (a blurred stroke, its inner half covered by the lake), the flat lake, then the ribbons.
svg += `<defs><filter id="halo" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${LAKE_HALO.blur}"/></filter></defs>`
for (const lake of m.water.lakes) {
  svg += `<path d="${lake}" fill="none" stroke="${palette.sea}" stroke-width="${LAKE_HALO.width}" stroke-linejoin="round" filter="url(#halo)"/>`
}
for (const lake of m.water.lakes) svg += `<path d="${lake}" fill="${palette.sea}"/>`
svg += `<path d="${m.water.coast}" fill="none" stroke="${palette.shore}" stroke-width="${SHORE_WIDTH}" stroke-linejoin="round"/>`
for (const lake of m.water.lakes)
  svg += `<path d="${lake}" fill="none" stroke="${palette.shore}" stroke-width="${SHORE_WIDTH}" stroke-linejoin="round"/>`
for (const city of m.cities) {
  svg += `<rect x="${city.x}" y="${city.y}" width="${city.width}" height="${city.height}" rx="${CITY_BOX_RADIUS}" fill="none" stroke="${palette.frame}" stroke-width="${CITY_BOX_STROKE}"/>`
}
// Lines in the original's stacking order, each on a ground-coloured casing.
const stacked = [...m.lines].sort((a, b) => LINE_DRAW_ORDER.indexOf(a.lineId) - LINE_DRAW_ORDER.indexOf(b.lineId))
const stroke = (d: string, color: string, width: number) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`
// As in the app: lines of one colour are cased together (no outline where one splits from another); an
// express lane sits under its line, a terminal stub is painted over it.
const groups = new Map<string, typeof stacked>()
for (const l of stacked) groups.set(l.line.color, [...(groups.get(l.line.color) ?? []), l])
for (const group of groups.values()) {
  for (const l of group) {
    for (const e of m.extras.filter((e) => e.lineId === l.lineId)) svg += stroke(e.d, palette.background, LINE_CASING)
    svg += stroke(l.d, palette.background, LINE_CASING)
  }
  for (const l of group) {
    const own = m.extras.filter((e) => e.lineId === l.lineId)
    for (const e of own.filter((e) => !e.terminal)) svg += stroke(e.d, l.line.color, LINE_STROKE)
    svg += stroke(l.d, l.line.color, LINE_STROKE)
    for (const e of own.filter((e) => e.terminal)) svg += stroke(e.d, l.line.color, LINE_STROKE)
  }
}
for (const s of m.irregular) {
  svg += `<path d="${s.d}" fill="none" stroke="${palette.background}" stroke-width="${IRREGULAR_STRIPE_WIDTH}" stroke-linecap="butt"/>`
}
// One marker per spot, as in the app: a lane shared by two lines keeps the more significant kind.
const rank = { terminal: 2, stop: 1, irregular: 0 }
const spots = new Map<string, (typeof m.markers)[number]>()
for (const mk of m.markers) {
  const key = `${mk.point.x.toFixed(1)}:${mk.point.y.toFixed(1)}`
  const previous = spots.get(key)
  if (!previous || rank[mk.kind] > rank[previous.kind]) spots.set(key, mk)
}
for (const mk of spots.values()) {
  const { x, y } = mk.point
  if (mk.kind === "irregular") {
    svg += `<circle cx="${x}" cy="${y}" r="${MARKER_RADIUS - IRREGULAR_STOP_STROKE / 2}" fill="none" stroke="${palette.dot}" stroke-width="${IRREGULAR_STOP_STROKE}"/>`
    continue
  }
  svg += `<circle cx="${x}" cy="${y}" r="${MARKER_RADIUS}" fill="${palette.dot}"/>`
  if (mk.kind === "terminal") {
    svg += `<circle cx="${x}" cy="${y}" r="${TERMINAL_RING_RADIUS}" fill="none" stroke="${palette.background}" stroke-width="${TERMINAL_RING_WIDTH}"/>`
  }
}
for (const e of m.extras) {
  if (!e.terminal) continue
  svg += `<circle cx="${e.terminal.x}" cy="${e.terminal.y}" r="${MARKER_RADIUS}" fill="${palette.dot}"/>`
  svg += `<circle cx="${e.terminal.x}" cy="${e.terminal.y}" r="${TERMINAL_RING_RADIUS}" fill="none" stroke="${palette.background}" stroke-width="${TERMINAL_RING_WIDTH}"/>`
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
  const size = nameFontSize(name)
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
console.log("lines", m.lines.length, "markers", m.markers.length, "labels", m.labels.length)
