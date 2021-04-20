import { useMemo } from "react"
import stations from "../../data/stations"
import { ImageSourcePropType } from "react-native"

type StationItem = {
  id: string
  name: string
  image: ImageSourcePropType
}

export default function useStationItems(searchTerm: string, originStation?: any): [StationItem?] {
  const filteredStations = useMemo(() => {
    // Remove the origin station from the list if it's selected
    if (!originStation) return stations
    return stations.filter((station) => station.id !== originStation.id)
  }, [originStation])

  if (searchTerm === "") return filteredStations
  return filteredStations.filter((item) => {
    return item.name.indexOf(searchTerm) > -1
  })
}
