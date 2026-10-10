import Fuse from "fuse.js"
import { useMemo } from "react"
import { sortedStations, type Station } from "@/data/stations"
import { useLocale, type Locale } from "@/i18n"

interface StationIndex {
  all: Station[]
  fuse: Fuse<Station>
}

/**
 * One collation and one inverted index per locale, for the lifetime of the module: the station list never changes, so
 * sharing it across pickers (and, on the Worker, across requests) is safe and saves rebuilding it four times a render.
 */
const indexes = new Map<Locale, StationIndex>()

function stationIndex(locale: Locale): StationIndex {
  let index = indexes.get(locale)
  if (!index) {
    const all = sortedStations(locale)
    const fuse = new Fuse(all, {
      keys: [{ name: "hebrew", weight: 2 }, { name: "english", weight: 2 }, "alias", "russian", "arabic"],
      threshold: 0.32,
      ignoreLocation: true,
    })
    index = { all, fuse }
    indexes.set(locale, index)
  }
  return index
}

/** Nothing to show while the picker is closed — a shared empty array keeps the hook's result identity stable. */
const NONE: Station[] = []

/**
 * Fuzzy station search over every language + aliases (matches the mobile app's behaviour). `enabled` is the picker
 * being open: most visitors never open one, so the index is built on the first search rather than during SSR or at
 * hydration, where four pickers would each pay for a collator sort and a five-field Fuse build.
 */
export function useStationSearch(query: string, enabled = true): { results: Station[]; all: Station[] } {
  const locale = useLocale()

  return useMemo(() => {
    if (!enabled) return { results: NONE, all: NONE }
    const { all, fuse } = stationIndex(locale)
    const trimmed = query.trim()
    return { results: trimmed ? fuse.search(trimmed).map((result) => result.item) : all, all }
  }, [query, locale, enabled])
}
