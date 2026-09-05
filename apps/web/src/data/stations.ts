import type { Locale } from "@/i18n"
import { stations, type Station } from "@better-rail/stations"

export { stations }
export type { Station }

const byId = new Map(stations.map((station) => [station.id, station]))

/** Stations are addressed by their Israel Railways id (`3700`) everywhere — URLs, storage and the app's deep links. */
export function getStationById(id: string | number | undefined | null): Station | undefined {
  if (id === undefined || id === null) return undefined
  return byId.get(String(id))
}

export function stationName(station: Station, locale: Locale): string {
  return locale === "he" ? station.hebrew : station.english
}

/** Station name by id in the given locale, falling back to an empty string for "ghost" stations the API sometimes returns. */
export function stationNameById(id: string | number, locale: Locale): string {
  const station = getStationById(id)
  return station ? stationName(station, locale) : ""
}

export type StationImageSize = 640 | 1280

export function stationImage(station: Station | undefined, size: StationImageSize): string | undefined {
  if (!station?.image) return undefined
  return `/stations/${station.image}-${size}.webp`
}

export function stationOgImage(station: Station | undefined): string | undefined {
  if (!station?.image) return undefined
  return `/stations/og/${station.image}.jpg`
}

export function sortedStations(locale: Locale): Station[] {
  const collator = new Intl.Collator(locale === "he" ? "he" : "en")
  return [...stations].sort((a, b) => collator.compare(stationName(a, locale), stationName(b, locale)))
}
