import stations from "../../data/stations.js"

type StationItem = {
  id: number
  name: string
}

export default function useStationItems(searchTerm: string): [StationItem] {
  console.log(searchTerm)
  console.log(stations[0].name.indexOf(searchTerm) > -1)
  return stations.filter((item) => {
    return item.name.indexOf(searchTerm) > -1
  })
}
