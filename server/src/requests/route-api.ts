import dayjs from "dayjs"
import { AxiosResponse } from "axios"

import { RailApi } from "./rail-api"
import { stationsObject } from "../data/stations"
import { RouteItem, Station } from "../types/rail"
import { routeDurationInMs } from "../utils/date-utils"
import { LanguageCode, railApiLocales } from "../locales/i18n"
import { RailApiGetRoutesResult } from "../types/rail-response"

export class RouteApi {
  private api: RailApi

  constructor(api: RailApi) {
    this.api = api
  }

  async getRoutes(
    originId: number,
    destinationId: number,
    departureDate: string | Date,
    locale: LanguageCode,
  ): Promise<RouteItem[]> {
    if (!originId || !destinationId) throw new Error("Missing origin / destination data")

    const hour = dayjs(departureDate).format("HH:mm")
    const date = dayjs(departureDate).format("YYYY-MM-DD")

    const response: AxiosResponse<RailApiGetRoutesResult> = await this.api.axiosInstance.get(
      `searchTrainLuzForDateTime?fromStation=${originId}&toStation=${destinationId}&date=${date}&hour=${hour}&scheduleType=1&systemType=1&languageId=${railApiLocales[locale]}`,
    )
    if (!response.data?.result) {
      throw new Error("Error fetching results")
    }

    const { travels } = response.data.result

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
            departureTime: new Date(station.departureTime).getTime(),
            arrivalTime: new Date(station.arrivalTime).getTime(),
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
          departureTime: new Date(departureTime).getTime(),
          arrivalTime: new Date(arrivalTime).getTime(),
          originPlatform: originPlatform,
          destinationPlatform: destPlatform,
          lastStop: stationsObject[lastStationId][stationLocale] as string,
          trainNumber,
          stopStations,
        }

        return route
      })

      const departureTime = new Date(route.departureTime).getTime()
      const arrivalTime = new Date(route.arrivalTime).getTime()

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
