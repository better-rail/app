import type { LanguageCode } from "@/i18n/i18n"
import { stations as sharedStations, type Station as SharedStation } from "@better-rail/stations"
import { stationImages } from "@better-rail/stations/images"

// Stations come from the shared `@better-rail/stations` package; this module attaches the bundled photos and locale helpers.
type Station = Omit<SharedStation, "image"> & {
  image?: any
}

export type NormalizedStation = {
  id: string
  name: string
  image?: any
  hebrew: string
  alias: string[]
}

const stations: Station[] = sharedStations.map((station) => ({
  ...station,
  image: station.image ? stationImages[station.image] : undefined,
}))

type StationsObjectType = {
  [key: string]: {
    id: string
    hebrew: string
    english: string
    russian: string
    arabic: string
    lat: number
    lon: number
    image?: any
    blurhash?: string
  }
}

export let stationLocale = "hebrew"

export function setStationLocale(lang: LanguageCode) {
  stationLocale = { he: "hebrew", en: "english", ar: "arabic", ru: "russian" }[lang] ?? "hebrew"
}

export const stationsObject: StationsObjectType = {}

stations.forEach((station) => {
  stationsObject[station.id] = station
})

function normalizeStation(station: Station): NormalizedStation {
  return {
    id: station.id,
    name: station[stationLocale],
    image: station.image,
    hebrew: station.hebrew,
    alias: station.alias ?? [],
  }
}

export const useStations = (): NormalizedStation[] =>
  stations.map(normalizeStation).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))

/**
 * Resolves a single station by id using `stationLocale` at call time.
 *
 * Unlike `useStations` (which snapshots the locale at render), this reads the
 * locale when invoked, so it stays correct for callers that run before locale
 * initialization — e.g. deep-link / home-screen-shortcut handlers, which mount
 * above the locale gate and would otherwise capture the default Hebrew names.
 */
export function getStationById(id: string): NormalizedStation | undefined {
  const station = stationsObject[id]
  return station ? normalizeStation(station) : undefined
}
