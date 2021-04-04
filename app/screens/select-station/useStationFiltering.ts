import stations from "../../data/stations.js"
import { ImageSourcePropType } from "react-native"

type StationItem = {
  id: string
  name: string
  image: ImageSourcePropType
}

export default function useStationItems(searchTerm: string): [StationItem?] {
  if (searchTerm === "") return []
  return stations.filter((item) => {
    return item.name.indexOf(searchTerm) > -1
  })
}
