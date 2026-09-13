import dayjs from "dayjs"

import { CONNECTION_LIMITS } from "./gtfs-route-api"
import { RailTimetableSearch, searchTimetableOnRailApi } from "./rail-api"
import { RailApiGetRoutesResult, RailApiRouteItem } from "../types/rail-response"

/**
 * Change-station searches (`viaStation`) under `RAIL_DATA_SOURCE=rail`. The rail API has
 * no such option, so the journey is built from two searches joined at the chosen station.
 */

const epochMs = (time: string) => new Date(time).getTime()

const byArrivalThenTrains = (a: RailApiRouteItem, b: RailApiRouteItem) =>
  epochMs(a.arrivalTime) - epochMs(b.arrivalTime) || a.trains.length - b.trains.length

// Joins each journey to the station with the onward journey that gets in soonest,
// inside the GTFS planner's connection window. Direct journeys are listed first.
export const stitchViaTravels = (toVia: RailApiRouteItem[], onward: RailApiRouteItem[]): RailApiRouteItem[] =>
  toVia
    .flatMap((first) => {
      const alighting = first.trains[first.trains.length - 1]
      const [next] = onward
        .filter(({ departureTime, trains: [boarding] }) => {
          const wait = epochMs(departureTime) - epochMs(first.arrivalTime)
          const stayingAboard = boarding.trainNumber === alighting.trainNumber
          const samePlatform = alighting.destPlatform > 0 && alighting.destPlatform === boarding.originPlatform
          const minWait = stayingAboard ? 0 : CONNECTION_LIMITS.minAt(boarding.orignStation, samePlatform)
          return wait >= minWait && wait <= CONNECTION_LIMITS.maxMs
        })
        .sort(byArrivalThenTrains)
      if (!next) return []

      return [
        {
          ...first,
          arrivalTime: next.arrivalTime,
          freeSeats: Math.min(first.freeSeats, next.freeSeats),
          travelMessages: [...(first.travelMessages ?? []), ...(next.travelMessages ?? [])],
          trains: [...first.trains, ...next.trains],
        },
      ]
    })
    .sort((a, b) => epochMs(a.departureTime) - epochMs(b.departureTime) || a.trains.length - b.trains.length)

export const searchViaOnRailApi = async (search: RailTimetableSearch, viaStation: number): Promise<RailApiGetRoutesResult> => {
  if (viaStation === search.fromStation || viaStation === search.toStation) return searchTimetableOnRailApi(search)

  const [toVia, onward] = await Promise.all([
    searchTimetableOnRailApi({ ...search, toStation: viaStation }),
    searchTimetableOnRailApi({ ...search, fromStation: viaStation }),
  ])
  const firstLegs = toVia.result?.travels ?? []
  let onwardLegs = onward.result?.travels ?? []

  // A late arrival can connect after midnight, which only the next day's timetable lists.
  const nextDay = dayjs(search.date).add(1, "day")
  const lastArrival = Math.max(...firstLegs.map((travel) => epochMs(travel.arrivalTime)))
  if (lastArrival + CONNECTION_LIMITS.maxMs >= nextDay.valueOf()) {
    const tomorrow = await searchTimetableOnRailApi({
      ...search,
      fromStation: viaStation,
      date: nextDay.format("YYYY-MM-DD"),
      hour: "00:00",
    })
    onwardLegs = [...onwardLegs, ...(tomorrow.result?.travels ?? [])]
  }

  return { ...toVia, result: { ...toVia.result, travels: stitchViaTravels(firstLegs, onwardLegs) } }
}
