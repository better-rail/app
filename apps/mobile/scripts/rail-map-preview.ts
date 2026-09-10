/**
 * Renders the Service Status map model to an SVG so the layout in
 * src/data/rail-map-layout.ts can be checked without a device:
 *
 *   bun run scripts/rail-map-preview.ts /tmp/rail-map.svg
 *
 * Station names come from the server's station list (English); the app draws
 * the same geometry with Skia (src/components/rail-map/rail-map.tsx).
 */
import { buildRailMapModel, LINE_STROKE, LABEL_FONT_SIZE, stationLabelLines } from "@/components/rail-map/rail-map-model"
import geo from "../../server/src/data/rail-stations-geo.json"
const names = new Map((geo as any[]).map((s) => [s.id, s.english]))
const m = buildRailMapModel()
const S = 8
const W = (m.bounds.width + 20) * S
const H = m.bounds.height * S
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="-12 0 ${m.bounds.width + 20} ${m.bounds.height}" font-family="Heebo, Arial, sans-serif">`
svg += `<rect x="-12" y="0" width="${m.bounds.width + 20}" height="${m.bounds.height}" fill="#0f1524"/>`
for (const l of m.lines)
  svg += `<path d="${l.d}" fill="none" stroke="${l.line.color}" stroke-width="${LINE_STROKE}" stroke-linecap="round" stroke-linejoin="round"/>`
for (const mk of m.markers) {
  if (mk.kind === "single")
    svg += `<circle cx="${mk.center.x}" cy="${mk.center.y}" r="${mk.radius}" fill="#0f1524" stroke="#fff" stroke-width="0.5"/>`
  else {
    svg += `<line x1="${mk.a.x}" y1="${mk.a.y}" x2="${mk.b.x}" y2="${mk.b.y}" stroke="#fff" stroke-width="${mk.radius * 2}" stroke-linecap="round"/>`
    for (const p of mk.lanePoints) svg += `<circle cx="${p.x}" cy="${p.y}" r="0.55" fill="#0f1524"/>`
  }
}
for (const lb of m.labels) {
  const name = names.get(lb.stationId) ?? lb.stationId
  const anchor = lb.side === "left" ? "end" : lb.side === "right" ? "start" : "middle"
  const lines = stationLabelLines(name)
  const lh = LABEL_FONT_SIZE * 1.12
  const block = lines.length * lh
  const top = lb.side === "above" ? lb.anchor.y - block : lb.side === "below" ? lb.anchor.y : lb.anchor.y - block / 2
  lines.forEach((text, i) => {
    svg += `<text x="${lb.anchor.x}" y="${top + i * lh + LABEL_FONT_SIZE * 0.85}" text-anchor="${anchor}" font-size="${LABEL_FONT_SIZE}" fill="#e8ecf5">${text.replace(/&/g, "&amp;").replace(/'/g, "&#39;")}</text>`
  })
}
svg += `</svg>`
await Bun.write(process.argv[2] ?? "/tmp/map.svg", svg)
console.log("lines", m.lines.length, "markers", m.markers.length, "labels", m.labels.length)
for (const l of m.lines) console.log(l.lineId, l.nodeIds.length, "nodes")
