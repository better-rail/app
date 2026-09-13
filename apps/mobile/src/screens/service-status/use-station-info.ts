import { useQuery } from "react-query"
import { userLocale } from "@/i18n"
import { type StationDepartures, type StationInfo, stationInfoApi } from "@/services/api"

/** A station's page from Israel Railways (entrances and their hours, facilities, notices); null when there is none to show. */
export function useStationInfo(stationId: string | null) {
  return useQuery<StationInfo | null>(
    ["stationInfo", stationId, userLocale],
    () => (stationId ? stationInfoApi.getStationInfo(stationId, userLocale) : Promise.resolve(null)),
    // The page changes rarely: an hour before it is asked for again, and a day in the cache.
    { enabled: !!stationId, staleTime: 60 * 60_000, cacheTime: 24 * 60 * 60_000, retry: 1 },
  )
}

/** The next trains calling at the station, refreshed every half minute while its card is up. */
export function useStationDepartures(stationId: string | null) {
  return useQuery<StationDepartures | null>(
    ["stationDepartures", stationId],
    () => (stationId ? stationInfoApi.getDepartures(stationId) : Promise.resolve(null)),
    { enabled: !!stationId, refetchInterval: 30_000, staleTime: 10_000, retry: 1 },
  )
}
