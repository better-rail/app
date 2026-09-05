import type { Locale } from "@/i18n"

/**
 * The picture behind a shared route link (Open Graph / Twitter card): the origin station's photo with the route —
 * and, for a link to one journey, its times — set over it in the site's type. It is composed as an SVG string so the
 * layout is plain data that can be unit-tested; `render.ts` rasterises it on the Worker.
 *
 * Text widths come from `measure`, which the renderer backs with the same fonts, so rows can be shrunk to fit and
 * their pieces (a time, an arrow, a time) placed side by side. Arrows are drawn as paths: Heebo has no arrow glyphs.
 *
 * resvg lays every text run out as a left-to-right paragraph, so Hebrew strings carry a leading right-to-left mark.
 * It makes digits and punctuation take their place in the right-to-left run — a platform number at the end of a
 * phrase, a time before a middot — the way a browser would.
 */

export const HERO_WIDTH = 1200
export const HERO_HEIGHT = 630
const PAD = 64
const CONTENT_WIDTH = HERO_WIDTH - 2 * PAD
/** Baseline of the bottom line of text */
const BOTTOM = HERO_HEIGHT - PAD

const RLM = "‏"

export type Weight = 500 | 700
/** Ink width of `text` set in Heebo at `size` px, as the renderer will draw it. */
export type Measure = (text: string, size: number, weight: Weight) => number

export interface HeroTrip {
  /** `HH:mm` */
  departure: string
  arrival: string
  /** "29 דק׳ · החלפה בבנימינה · רציף 2" */
  facts: string
}

export interface HeroContent {
  locale: Locale
  origin: string
  destination: string
  /** Under the names when the link is to the route rather than a journey */
  tagline: string
  /** Origin station photo as a `data:` URI; a brand gradient stands in when the station has none */
  photo?: string
  trip?: HeroTrip
}

type Piece = { text: string } | { arrow: true }

interface Style {
  size: number
  weight: Weight
  opacity?: number
}

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!)
}

const px = (value: number) => String(Math.round(value * 10) / 10)

function textSvg(x: number, baseline: number, style: Style, anchor: "start" | "end", content: string, rtl: boolean): string {
  const opacity = style.opacity === undefined ? "" : ` fill-opacity="${style.opacity}"`
  const mark = rtl ? RLM : ""
  return `<text x="${px(x)}" y="${px(baseline)}" font-family="Heebo" font-weight="${style.weight}" font-size="${px(style.size)}" fill="#fff" text-anchor="${anchor}"${opacity}>${mark}${escapeXml(content)}</text>`
}

// Lucide's arrow-right / arrow-left, on a 24-unit box.
const ARROW_RIGHT = "M5 12h14M12 5l7 7-7 7"
const ARROW_LEFT = "M19 12H5M12 19l-7-7 7-7"

function arrowSvg(x: number, centerY: number, size: number, rtl: boolean): string {
  const scale = size / 24
  return `<path d="${rtl ? ARROW_LEFT : ARROW_RIGHT}" transform="translate(${px(x)} ${px(centerY - size / 2)}) scale(${px(scale)})" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
}

const gapFor = (size: number) => size * 0.3
const arrowFor = (size: number) => size * 0.8

function rowWidth(pieces: Piece[], style: Style, measure: Measure): number {
  return pieces.reduce(
    (width, piece, index) =>
      width +
      (index > 0 ? gapFor(style.size) : 0) +
      ("arrow" in piece ? arrowFor(style.size) : measure(piece.text, style.size, style.weight)),
    0,
  )
}

/** Lays the pieces out along `baseline` from the reading edge: the left in English, the right in Hebrew. */
function row(pieces: Piece[], style: Style, baseline: number, rtl: boolean, measure: Measure): string {
  const gap = gapFor(style.size)
  const arrow = arrowFor(style.size)
  let cursor = rtl ? HERO_WIDTH - PAD : PAD
  const advance = (width: number) => (cursor += rtl ? -width : width)
  return pieces
    .map((piece, index) => {
      if (index > 0) advance(gap)
      if ("arrow" in piece) {
        const svg = arrowSvg(rtl ? cursor - arrow : cursor, baseline - style.size * 0.36, arrow, rtl)
        advance(arrow)
        return svg
      }
      const svg = textSvg(cursor, baseline, style, rtl ? "end" : "start", piece.text, rtl)
      advance(measure(piece.text, style.size, style.weight))
      return svg
    })
    .join("")
}

/** The largest size, at most `maxSize`, at which every row fits the content width — widths scale with the size. */
function fitSize(rows: Piece[][], maxSize: number, minSize: number, weight: Weight, measure: Measure): number {
  const size = rows.reduce((best, pieces) => {
    const width = rowWidth(pieces, { size: maxSize, weight }, measure)
    return width > CONTENT_WIDTH ? Math.min(best, (maxSize * CONTENT_WIDTH) / width) : best
  }, maxSize)
  return Math.max(minSize, Math.floor(size))
}

const CAPTION: Style = { size: 30, weight: 500, opacity: 0.85 }

function caption(text: string, baseline: number, rtl: boolean): string {
  return textSvg(rtl ? HERO_WIDTH - PAD : PAD, baseline, CAPTION, rtl ? "end" : "start", text, rtl)
}

/** Origin on one line, the arrow and destination on the next, the tagline underneath. */
function routeBlock(content: HeroContent, rtl: boolean, measure: Measure): string {
  const lines: Piece[][] = [[{ text: content.origin }], [{ arrow: true }, { text: content.destination }]]
  const style: Style = { size: fitSize(lines, 76, 40, 700, measure), weight: 700 }
  const second = BOTTOM - 62
  const first = second - style.size * 1.18
  return [
    row(lines[0], style, first, rtl, measure),
    row(lines[1], style, second, rtl, measure),
    caption(content.tagline, BOTTOM, rtl),
  ].join("")
}

/** The times large, the route on one line, then the journey's facts. */
function tripBlock(content: HeroContent, trip: HeroTrip, rtl: boolean, measure: Measure): string {
  const routeLine: Piece[] = [{ text: content.origin }, { arrow: true }, { text: content.destination }]
  const routeStyle: Style = { size: fitSize([routeLine], 40, 26, 700, measure), weight: 700 }
  const timesStyle: Style = { size: 96, weight: 700 }
  const routeBaseline = BOTTOM - 56
  const timesBaseline = routeBaseline - routeStyle.size * 0.75 - 24
  return [
    row([{ text: trip.departure }, { arrow: true }, { text: trip.arrival }], timesStyle, timesBaseline, rtl, measure),
    row(routeLine, routeStyle, routeBaseline, rtl, measure),
    caption(trip.facts, BOTTOM, rtl),
  ].join("")
}

// The app icon (public/assets/images/icon.svg) on the white rounded tile the site shows it on.
const APP_ICON = `<defs><linearGradient x1="50%" y1="103.1%" x2="50%" y2="34.3%" id="i-a"><stop stop-color="#C9C9C9" offset="0%"/><stop stop-color="#B3B3B3" offset="100%"/></linearGradient><linearGradient x1="50%" y1="101.1%" x2="50%" y2="34.5%" id="i-b"><stop stop-color="#C9C9C9" offset="0%"/><stop stop-color="#B3B3B3" offset="100%"/></linearGradient><linearGradient x1="40.8%" y1=".1%" x2="59.4%" y2="105.7%" id="i-c"><stop stop-color="#2AA4F4" offset="0%"/><stop stop-color="#007AD9" offset="100%"/></linearGradient><linearGradient x1="45.6%" y1="-1.5%" x2="54.4%" y2="101.8%" id="i-d"><stop stop-color="#0D61A9" offset="0%"/><stop stop-color="#16528C" offset="100%"/></linearGradient><linearGradient x1="46.5%" y1="8.5%" x2="55.3%" y2="111.8%" id="i-e"><stop stop-color="#0D61A9" offset="0%"/><stop stop-color="#16528C" offset="100%"/></linearGradient></defs><g fill-rule="nonzero" fill="none"><path fill="url(#i-a)" d="M74 87h-8l6 17h8z"/><path fill="url(#i-b)" d="M6 104h8l6-17h-8z"/><path d="M43 0C28 0 17 2 10 5 4 6 0 12 0 18v57c0 8 6 14 14 14h58c8 0 14-6 14-14V18c0-6-4-12-10-13-7-3-18-5-33-5z" fill="url(#i-c)"/><path d="M72 49H52c-3 0-6-3-6-6V23c0-3 3-6 6-6h20c3 0 6 3 6 6v20c0 3-3 6-6 6z" fill="url(#i-d)"/><path d="M34 49H14c-3 0-6-3-6-6V23c0-3 3-6 6-6h20c3 0 6 3 6 6v20c0 3-3 6-6 6z" fill="url(#i-e)"/><circle fill="#FFF" cx="67" cy="74" r="7"/><circle fill="#FFF" cx="18" cy="74" r="7"/></g>`

function appIcon(x: number, y: number, size: number): string {
  const height = size * 0.58
  const width = (height * 86) / 104
  return `<rect x="${px(x)}" y="${px(y)}" width="${px(size)}" height="${px(size)}" rx="${px(size * 0.22)}" fill="#fff"/><svg x="${px(x + (size - width) / 2)}" y="${px(y + (size - height) / 2)}" width="${px(width)}" height="${px(height)}" viewBox="0 0 86 104">${APP_ICON}</svg>`
}

/** "Better Rail" with the app icon, in the top corner the reading starts from. */
function brand(rtl: boolean, measure: Measure): string {
  const label = "Better Rail"
  const style: Style = { size: 28, weight: 700 }
  const tile = 44
  const top = 52
  const gap = 14
  const baseline = top + tile / 2 + style.size * 0.36
  if (!rtl) return appIcon(PAD, top, tile) + textSvg(PAD + tile + gap, baseline, style, "start", label, false)
  const textWidth = measure(label, style.size, style.weight)
  return (
    appIcon(HERO_WIDTH - PAD - textWidth - gap - tile, top, tile) +
    textSvg(HERO_WIDTH - PAD, baseline, style, "end", label, false)
  )
}

export function heroSvg(content: HeroContent, measure: Measure): string {
  const rtl = content.locale === "he"
  const background = content.photo
    ? `<image href="${content.photo}" x="0" y="0" width="${HERO_WIDTH}" height="${HERO_HEIGHT}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect width="${HERO_WIDTH}" height="${HERO_HEIGHT}" fill="url(#brand)"/>`
  const body = content.trip ? tripBlock(content, content.trip, rtl, measure) : routeBlock(content, rtl, measure)
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${HERO_WIDTH}" height="${HERO_HEIGHT}" viewBox="0 0 ${HERO_WIDTH} ${HERO_HEIGHT}">`,
    `<defs>`,
    // Darkens the top a little for the brand and the bottom a lot for the text, leaving the middle of the photo alone.
    `<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.5"/><stop offset="0.3" stop-color="#000" stop-opacity="0.06"/><stop offset="0.48" stop-color="#000" stop-opacity="0.14"/><stop offset="1" stop-color="#000" stop-opacity="0.84"/></linearGradient>`,
    `<linearGradient id="brand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2aa4f4"/><stop offset="0.55" stop-color="#0a6fbf"/><stop offset="1" stop-color="#0c3a66"/></linearGradient>`,
    `</defs>`,
    `<rect width="${HERO_WIDTH}" height="${HERO_HEIGHT}" fill="#0c3a66"/>`,
    background,
    `<rect width="${HERO_WIDTH}" height="${HERO_HEIGHT}" fill="url(#shade)"/>`,
    brand(rtl, measure),
    body,
    `</svg>`,
  ].join("")
}
