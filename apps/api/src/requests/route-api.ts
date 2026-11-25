import { searchTrain } from "./gtfs-route-api"
import { stationsObject } from "../data/stations"
import { config } from "../config"
import { RouteItem, Station } from "../types/rail"
import { RailTimetableSearch, searchTimetableOnRailApi } from "./rail-api"
import { searchViaOnRailApi } from "./rail-via"
import { RIDE_LOOKUP_SHORTCUT_BUDGET_MS, paateModiinChanges } from "./rail-shortcuts"
import { routeDurationInMs } from "../utils/date-utils"
import { israelDateAndHour, israelEpoch } from "../utils/israel-time"
import { LanguageCode, railApiLocales } from "../locales/i18n"
import { isEqual } from "lodash"

/**
 * The rail API's travels with the Pa'ate Modi'in changes added: every caller
 * looks up a ride already chosen (live rides, auto-start), which may be on one.
 *
 * Given the ride's `trains`, the extra search runs only when the rail API's own
 * answer lacks them. A live ride looks its route up every minute, and most rides
 * from Jerusalem-Yitzhak Navon are on trains the rail API offers, so the two
 * extra requests would be spent on every tick for nothing. A ride on a Pa'ate
 * Modi'in change pays for the searches one after the other, which its budget
 * allows (no one is waiting on a screen for it).
 */
const searchTimetableWithShortcuts = async (railSearch: RailTimetableSearch, trains?: number[]) => {
  if (!trains) {
    const shortcuts = paateModiinChanges(railSearch, RIDE_LOOKUP_SHORTCUT_BUDGET_MS)
    return shortcuts.addTo(await searchTimetableOnRailApi(railSearch))
  }

  const railResult = await searchTimetableOnRailApi(railSearch)
  const hasRide = railResult?.result?.travels?.some((travel) => isEqual(travel.trains.map((train) => train.trainNumber), trains))
  if (hasRide) return railResult
  return paateModiinChanges(railSearch, RIDE_LOOKUP_SHORTCUT_BUDGET_MS).addTo(railResult)
}

type SearchOptions = {
  viaStation?: number
  /** The trains of the ride being looked up, by number, when it is known. */
  trains?: number[]
}

/** The timetable's raw travels (the rail API's shape, which the app and its Live Activity decode) around a departure. */
export const searchTravels = async (
  originId: number,
  destinationId: number,
  departureDate: string | Date,
  locale: LanguageCode,
  options: SearchOptions = {},
) => {
  if (!originId || !destinationId) throw new Error("Missing origin / destination data")

  // The timetable's own wall clock (the Bun server got this for free from TZ=Asia/Jerusalem).
  const { date, hour } = israelDateAndHour(departureDate instanceof Date ? departureDate.toISOString() : departureDate)

  // Both sources answer in the rail API's `{ result: { travels } }` shape, so the
  // formatting below is the same either way (see data/config.ts on the flag).
  const railSearch = {
    fromStation: originId,
    toStation: destinationId,
    date,
    hour,
    scheduleType: "ByDeparture" as const,
    languageId: railApiLocales[locale],
  }
  const response =
    config.railDataSource === "gtfs"
      ? await searchTrain(originId, destinationId, date, hour, "ByDeparture", { viaStation: options.viaStation })
      : options.viaStation
        ? await searchViaOnRailApi(railSearch, options.viaStation)
        : await searchTimetableWithShortcuts(railSearch, options.trains)

  if (!response?.result) {
    throw new Error("Error fetching results")
  }
  return response.result.travels
}

export class RouteApi {
  async getRoutes(
    originId: number,
    destinationId: number,
    departureDate: string | Date,
    locale: LanguageCode,
    options: SearchOptions = {},
  ): Promise<RouteItem[]> {
    const travels = await searchTravels(originId, destinationId, departureDate, locale, options)

    // format for usage in the UI
    const formattedRoutes = travels.map((route) => {
      const trains = route.trains.map((train) => {
        const {
          orignStation,
          destinationStation,
          departureTime,
          arrivalTime,
          originPlatform,
          destPlatform,
          trainNumber,
          routeStations,
          trainPosition,
        } = train

        const stationLocale = railApiLocales[locale].toLowerCase() as keyof Station

        const stopStations = train.stopStations.map((station) => {
          const { stationId } = station
          const stationName = stationsObject[stationId][stationLocale] as string

          return {
            ...station,
            departureTime: israelEpoch(station.departureTime),
            arrivalTime: israelEpoch(station.arrivalTime),
            stationName,
          }
        })

        const lastStationId = routeStations[routeStations.length - 1].stationId

        const route = {
          delay: trainPosition?.calcDiffMinutes ?? 0,
          originStationId: orignStation,
          originStationName: stationsObject[orignStation][stationLocale] as string,
          destinationStationId: destinationStation,
          destinationStationName: stationsObject[destinationStation][stationLocale] as string,
          departureTime: israelEpoch(departureTime),
          arrivalTime: israelEpoch(arrivalTime),
          originPlatform: originPlatform,
          destinationPlatform: destPlatform,
          lastStop: stationsObject[lastStationId][stationLocale] as string,
          trainNumber,
          stopStations,
        }

        return route
      })

      const departureTime = israelEpoch(route.departureTime)
      const arrivalTime = israelEpoch(route.arrivalTime)

      return {
        ...route,
        departureTime,
        arrivalTime,
        trains,
        delay: trains?.[0].delay ?? 0,
        duration: routeDurationInMs(departureTime, arrivalTime),
        isExchange: trains.length > 1,
      }
    })

    return formattedRoutes
  }
}
