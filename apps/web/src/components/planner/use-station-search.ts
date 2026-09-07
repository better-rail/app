import Fuse from "fuse.js"
import { useMemo } from "react"
import { sortedStations, type Station } from "@/data/stations"
import { useLocale } from "@/i18n"

/** Fuzzy station search over every language + aliases (matches the mobile app's behaviour). */
export function useStationSearch(query: string): { results: Station[]; all: Station[] } {
  const locale = useLocale()
  const all = useMemo(() => sortedStations(locale), [locale])
  const fuse = useMemo(
    () =>
      new Fuse(all, {
        keys: [{ name: "hebrew", weight: 2 }, { name: "english", weight: 2 }, "alias", "russian", "arabic"],
        threshold: 0.32,
        ignoreLocation: true,
      }),
    [all],
  )

  const results = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) return all
    return fuse.search(trimmed).map((result) => result.item)
  }, [query, fuse, all])

  return { results, all }
}
