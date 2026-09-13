import dayjs from "dayjs"

import { CONNECTION_LIMITS, onTheSameFace } from "./gtfs-route-api"
import { RailTimetableSearch, searchTimetableOnRailApi } from "./rail-api"
import { RailApiGetRoutesResult, RailApiRouteItem, Train } from "../types/rail-response"

// The rail API has no `viaStation`, so change-station searches join two searches at that station.

const epochMs = (time: string) => new Date(time).getTime()

const byArrivalThenTrains = (a: RailApiRouteItem, b: RailApiRouteItem) =>
  epochMs(a.arrivalTime) - epochMs(b.arrivalTime) || a.trains.length - b.trains.length

// A train running straight through the station stays one leg.
const throughTrain = (off: Train, on: Train): Train => ({
  ...on,
  orignStation: off.orignStation,
  originPlatform: off.originPlatform,
  originPlatformChanged: off.originPlatformChanged,
  departureTime: off.departureTime,
  freeSeats: Math.min(off.freeSeats, on.freeSeats),
  trainPosition: off.trainPosition,
  stopStations: [
    ...off.stopStations,
    {
      stationId: on.orignStation,
      arrivalTime: off.arrivalTime,
      departureTime: on.departureTime,
      platform: on.originPlatform,
      platformChanged: on.originPlatformChanged,
      crowded: on.crowded,
    },
    ...on.stopStations,
  ],
})

export const stitchViaTravels = (toVia: RailApiRouteItem[], onward: RailApiRouteItem[]): RailApiRouteItem[] =>
  toVia
    .flatMap((first) => {
      const alighting = first.trains[first.trains.length - 1]
      const [next] = onward
        .filter(({ departureTime, trains: [boarding] }) => {
          const wait = epochMs(departureTime) - epochMs(first.arrivalTime)
          const stayingAboard = boarding.trainNumber === alighting.trainNumber
          const sameFace = onTheSameFace(boarding.orignStation, alighting.destPlatform, boarding.originPlatform)
          const minWait = stayingAboard ? 0 : CONNECTION_LIMITS.minAt(boarding.orignStation, sameFace)
          return wait >= minWait && wait <= CONNECTION_LIMITS.maxMs
        })
        .sort(byArrivalThenTrains)
      if (!next) return []

      const [boarding, ...onwardTrains] = next.trains
      const trains =
        boarding.trainNumber === alighting.trainNumber
          ? [...first.trains.slice(0, -1), throughTrain(alighting, boarding), ...onwardTrains]
          : [...first.trains, ...next.trains]

      return [
        {
          ...first,
          arrivalTime: next.arrivalTime,
          freeSeats: Math.min(first.freeSeats, next.freeSeats),
          travelMessages: [...(first.travelMessages ?? []), ...(next.travelMessages ?? [])],
          trains,
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
