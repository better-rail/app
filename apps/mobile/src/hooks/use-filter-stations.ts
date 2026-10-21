import { createStationSearch, type StationSearch } from "@better-rail/stations/search"
import { getStationById, type NormalizedStation } from "@/data/stations"

// Built on the first search, not at app launch.
let stationSearch: StationSearch | undefined

export function useFilteredStations(searchTerm: string) {
  const filteredStations = (() => {
    if (searchTerm === "") return []
    stationSearch ??= createStationSearch()
    return stationSearch
      .search(searchTerm)
      .map((result) => getStationById(result.item.id))
      .filter((station): station is NormalizedStation => station !== undefined)
  })()

  return { filteredStations }
}
