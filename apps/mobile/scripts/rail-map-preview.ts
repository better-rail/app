/**
 * Renders the Service Status map model to an SVG so the layout in
 * src/data/rail-map-layout.ts can be checked against the original artwork
 * without a device:
 *
 *   bun run scripts/rail-map-preview.ts /tmp/rail-map.svg
 *
 * Station names come from the server's station list (English); the app draws
 * the same geometry with Skia (src/components/rail-map/rail-map.tsx).
 */
import {
  buildRailMapModel,
  LINE_STROKE,
  LABEL_FONT_SIZE,
  LABEL_LINE_HEIGHT,
  MARKER_RADIUS,
  SMALL_LABEL_BREAK_LENGTH,
  LABEL_BREAK_LENGTH,
  stationLabelLines,
} from "@/components/rail-map/rail-map-model"
import geo from "../../server/src/data/rail-stations-geo.json"

const names = new Map((geo as { id: string; english: string }[]).map((s) => [s.id, s.english]))
const m = buildRailMapModel()
const PAD = { left: 4, right: 6 }
const S = 17.32 // back to the original's pixel scale
const W = (m.bounds.width + PAD.left + PAD.right) * S
const H = m.bounds.height * S
const BG = "#f6f6f8"
const INK = "#1d1d1f"
const WHITE = "#f4f4f6"
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${-PAD.left} 0 ${m.bounds.width + PAD.left + PAD.right} ${m.bounds.height}" font-family="Heebo, Arial, sans-serif">`
svg += `<rect x="${-PAD.left}" y="0" width="${m.bounds.width + PAD.left + PAD.right}" height="${m.bounds.height}" fill="${BG}"/>`
for (const l of m.lines) {
  svg += `<path d="${l.d}" fill="none" stroke="${l.line.color}" stroke-width="${LINE_STROKE}" stroke-linecap="round" stroke-linejoin="round"/>`
}
for (const mk of m.markers) {
  for (const p of mk.lanePoints) svg += `<circle cx="${p.x}" cy="${p.y}" r="${MARKER_RADIUS}" fill="${INK}"/>`
}
for (const lb of m.labels) {
  const name = names.get(lb.stationId) ?? lb.stationId
  const anchor = lb.side === "left" ? "end" : lb.side === "right" ? "start" : "middle"
  const lines = stationLabelLines(name, lb.fontScale < 1 ? SMALL_LABEL_BREAK_LENGTH : LABEL_BREAK_LENGTH, lb.stationNameOnly)
  const fs = LABEL_FONT_SIZE * lb.fontScale
  const lh = fs * LABEL_LINE_HEIGHT
  const block = lines.length * lh
  const top = lb.side === "above" ? lb.anchor.y - block : lb.side === "below" ? lb.anchor.y : lb.anchor.y - block / 2
  lines.forEach((text, i) => {
    svg += `<text x="${lb.anchor.x}" y="${top + i * lh + fs * 0.85}" text-anchor="${anchor}" font-size="${fs}" fill="#2b2b30">${text.replace(/&/g, "&amp;").replace(/'/g, "&#39;")}</text>`
  })
}
svg += `</svg>`
await Bun.write(process.argv[2] ?? "/tmp/rail-map.svg", svg)
console.log("lines", m.lines.length, "markers", m.markers.length, "labels", m.labels.length)
