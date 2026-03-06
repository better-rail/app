import { useMemo } from "react"
import { useStations, NormalizedStation } from "../data/stations"
import { calculateDistance } from "../utils/distance"
import { UserLocation } from "./use-user-location"

export type StationWithDistance = NormalizedStation & {
  distance: number
}

export function useNearbyStations(userLocation: UserLocation | null, limit = 5): StationWithDistance[] {
  const stations = useStations()

  const nearbyStations = useMemo(() => {
    if (!userLocation) return []

    const stationsWithDistance = stations.map((station) => ({
      ...station,
      distance: calculateDistance(userLocation.latitude, userLocation.longitude, station.lat, station.lon),
    }))

    return stationsWithDistance.sort((a, b) => a.distance - b.distance).slice(0, limit)
  }, [stations, userLocation, limit])

  return nearbyStations
}
