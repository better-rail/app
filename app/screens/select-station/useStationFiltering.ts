type StationItem = {
  id: number
  name: string
}

const STATIONS: [StationItem] = [
  {
    id: 1,
    name: "ירושלים - יצחק נבון",
    image: require("../../../assets/jlm.jpg"),
  },
  {
    id: 2,
    name: "ירושלים - מלחה",
    image: require("../../../assets/malha.jpg"),
  },
]

export default function useStationItems(searchTerm: string): [StationItem] {
  return STATIONS.filter((item) => {
    return item.name.indexOf(searchTerm) > -1
  })
}
