import Fuse from "fuse.js"
import { useMemo } from "react"
import { useStations } from "../data/stations"

export function useFilteredStations(searchTerm: string) {
  const stations = useStations()

  const fuse = useMemo(() => new Fuse(stations, { keys: ["name", "hebrew", "alias"], threshold: 0.3 }), [stations])

  const filteredStations = useMemo(() => {
    if (searchTerm === "") return []
    return fuse.search(searchTerm).map((result) => result.item)
  }, [searchTerm, fuse])

  return { filteredStations }
}
