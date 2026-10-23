import { searchTrain } from "./gtfs-route-api"
import { stationsObject } from "../data/stations"
import { config } from "../config"
import { RouteItem, Station } from "../types/rail"
import { searchTimetableOnRailApi } from "./rail-api"
import { searchViaOnRailApi } from "./rail-via"
import { routeDurationInMs } from "../utils/date-utils"
import { israelDateAndHour, israelEpoch } from "../utils/israel-time"
import { LanguageCode, railApiLocales } from "../locales/i18n"

export class RouteApi {
  async getRoutes(
    originId: number,
    destinationId: number,
    departureDate: string | Date,
    locale: LanguageCode,
    options: { viaStation?: number } = {},
  ): Promise<RouteItem[]> {
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
          : await searchTimetableOnRailApi(railSearch)

    if (!response?.result) {
      throw new Error("Error fetching results")
    }

    const { travels } = response.result

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
