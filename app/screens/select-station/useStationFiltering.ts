import stations from "../../data/stations.js"
import { ImageSourcePropType } from "react-native"

type StationItem = {
  id: number
  name: string
  image: ImageSourcePropType
}

export default function useStationItems(searchTerm: string): [StationItem] {
  return stations.filter((item) => {
    return item.name.indexOf(searchTerm) > -1
  })
}
