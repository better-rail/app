import type { Locale } from "@/i18n"
import { stations as rawStations, type Station as RawStation } from "@better-rail/stations"

export type Station = RawStation & {
  /** URL-safe identifier derived from the English name, e.g. `tel-aviv-savidor-center` */
  slug: string
}

/** Turns "Be'er Sheva - North/University" into "beer-sheva-north-university". */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export const stations: Station[] = rawStations.map((station) => ({ ...station, slug: slugify(station.english) }))

const byId = new Map(stations.map((station) => [station.id, station]))
const bySlug = new Map(stations.map((station) => [station.slug, station]))

if (bySlug.size !== stations.length) {
  const seen = new Set<string>()
  const duplicates = stations.map((s) => s.slug).filter((slug) => (seen.has(slug) ? true : (seen.add(slug), false)))
  throw new Error(`Duplicate station slugs: ${duplicates.join(", ")}`)
}

export function getStationById(id: string | number | undefined | null): Station | undefined {
  if (id === undefined || id === null) return undefined
  return byId.get(String(id))
}

export function getStationBySlug(slug: string | undefined): Station | undefined {
  if (!slug) return undefined
  return bySlug.get(slug.toLowerCase())
}

/** Accepts either a slug (`herzliya`) or a legacy numeric id (`3500`, as used by the app's deep links). */
export function resolveStation(param: string | undefined): Station | undefined {
  if (!param) return undefined
  return getStationBySlug(param) ?? (/^\d+$/.test(param) ? getStationById(param) : undefined)
}

export function stationName(station: Station | RawStation, locale: Locale): string {
  return locale === "he" ? station.hebrew : station.english
}

/** Station name by id in the given locale, falling back to an empty string for "ghost" stations the API sometimes returns. */
export function stationNameById(id: string | number, locale: Locale): string {
  const station = getStationById(id)
  return station ? stationName(station, locale) : ""
}

export type StationImageSize = 640 | 1280

export function stationImage(station: Station | RawStation | undefined, size: StationImageSize): string | undefined {
  if (!station?.image) return undefined
  return `/stations/${station.image}-${size}.webp`
}

export function stationOgImage(station: Station | RawStation | undefined): string | undefined {
  if (!station?.image) return undefined
  return `/stations/og/${station.image}.jpg`
}

export function sortedStations(locale: Locale): Station[] {
  const collator = new Intl.Collator(locale === "he" ? "he" : "en")
  return [...stations].sort((a, b) => collator.compare(stationName(a, locale), stationName(b, locale)))
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: RawStation, b: RawStation): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

export function nearbyStations(station: Station, count = 4): Station[] {
  return stations
    .filter((other) => other.id !== station.id)
    .sort((a, b) => distanceKm(station, a) - distanceKm(station, b))
    .slice(0, count)
}

const mustGet = (slug: string): Station => {
  const station = getStationBySlug(slug)
  if (!station) throw new Error(`Unknown station slug "${slug}"`)
  return station
}

/** The busiest stations on the network — used as suggested destinations on station pages. */
export const hubStations: Station[] = [
  "tel-aviv-savidor-center",
  "tel-aviv-hashalom",
  "tel-aviv-hahagana",
  "tel-aviv-university",
  "jerusalem-yitzhak-navon",
  "haifa-hof-hakarmel",
  "haifa-center-hashmona",
  "ben-gurion-airport",
  "beer-sheva-center",
  "herzliya",
  "netanya",
  "modiin-center",
  "rishon-letsiyon-moshe-dayan",
  "ashkelon",
  "nahariya",
  "binyamina",
].map(mustGet)

/** Curated high-traffic pairs for the home page. */
export const popularRoutes: Array<[Station, Station]> = (
  [
    ["tel-aviv-savidor-center", "jerusalem-yitzhak-navon"],
    ["tel-aviv-hashalom", "ben-gurion-airport"],
    ["tel-aviv-savidor-center", "haifa-hof-hakarmel"],
    ["tel-aviv-savidor-center", "beer-sheva-center"],
    ["herzliya", "tel-aviv-hashalom"],
    ["netanya", "tel-aviv-savidor-center"],
    ["modiin-center", "tel-aviv-hashalom"],
    ["rishon-letsiyon-moshe-dayan", "tel-aviv-hahagana"],
    ["haifa-hof-hakarmel", "nahariya"],
    ["ashkelon", "tel-aviv-hahagana"],
    ["binyamina", "tel-aviv-savidor-center"],
    ["jerusalem-yitzhak-navon", "ben-gurion-airport"],
  ] as const
).map(([from, to]) => [mustGet(from), mustGet(to)])

/** Suggested destinations for a station page: hubs first (excluding itself), then the nearest stations. */
export function suggestedDestinations(station: Station, count = 8): Station[] {
  const hubs = hubStations.filter((hub) => hub.id !== station.id)
  const nearby = nearbyStations(station, 6).filter((near) => !hubs.some((hub) => hub.id === near.id))
  return [...hubs, ...nearby].slice(0, count)
}
