import { railApi } from "./rail-api"
import { AxiosResponse } from "axios"
import { stationsObject, stationLocale } from "@/data/stations"
import { RailApiGetRoutesResult } from "./rail-api.types"
import { formatRouteDuration, routeDurationInMs } from "@/utils/helpers/date-helpers"
import { RouteItem } from "."
import { getHours, parse, isSameDay, addDays } from "date-fns"
import { IS_E2E } from "@/config/e2e"
import { getE2ERoutes } from "./e2e-route-fixtures"
import { withDurationFlags } from "./route-duration-flags"

export class RouteApi {
  private api = railApi

  async getRoutes(
    originId: string,
    destinationId: string,
    date: string,
    hour: string,
    options: { viaStation?: string } = {},
  ): Promise<RouteItem[]> {
    if (!originId || !destinationId) throw new Error("Missing origin / destination data")

    if (IS_E2E) {
      return getE2ERoutes(originId, destinationId, date, hour, options)
    }

    try {
      const requestBody = {
        methodName: "searchTrainLuzForDateTime",
        fromStation: parseInt(originId),
        toStation: parseInt(destinationId),
        date: date,
        hour: hour,
        systemType: "1",
        scheduleType: "ByDeparture",
        languageId: "Hebrew",
        ...(options.viaStation ? { viaStation: parseInt(options.viaStation) } : {}),
      }

      const response: AxiosResponse<RailApiGetRoutesResult> = await this.api.axiosInstance.post(
        `/rjpa/api/v1/timetable/searchTrainForMobile`,
        requestBody,
      )
      if (!response.data?.result) throw new Error("Error fetching results")

      const { travels } = response.data.result

      // on certain scenerios the API return dates for the next day - we need to filter those
      const filterFn = filterRoutes(parse(date, "yyyy-MM-dd", new Date()))
      const filteredTravels = travels.filter((travel) => filterFn(travel.departureTime))

      // format for usage in the UI
      const formattedRoutes = filteredTravels.map((route) => {
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
            visaWagonData,
            isCancelled,
            actualLastStationId,
            originPlatformChanged,
            destPlatformChanged,
          } = train

          const stopStations = train.stopStations.map((station) => {
            const { stationId } = station
            // In rare cases the API returns "ghost" stations that are not in stationsObject
            const stationName = stationsObject[stationId]?.[stationLocale] ?? ""

            return {
              ...station,
              departureTime: new Date(station.departureTime).getTime(),
              departureTimeString: station.departureTime,
              arrivalTime: new Date(station.arrivalTime).getTime(),
              arrivalTimeString: station.arrivalTime,
              stationName,
            }
          })

          // The last stop is fetched from the "crowded" details
          // const trainCrowdDetail = crowdDetails.find((detail) => detail.TrainNumber === Number(Trainno))
          // const lastStationId = trainCrowdDetail.Stations[trainCrowdDetail.Stations.length - 1].StationNumber
          const scheduledLastStationId = routeStations[routeStations.length - 1].stationId
          const lastStationId =
            actualLastStationId && stationsObject[actualLastStationId] ? actualLastStationId : scheduledLastStationId

          const stationCancelled = (stationId: number) =>
            routeStations.find((station) => station.stationId === stationId)?.cancelled ?? false

          const modifiedTrain = {
            delay: trainPosition?.calcDiffMinutes ?? 0,
            isCancelled: isCancelled ?? false,
            isLastStopChanged: lastStationId !== scheduledLastStationId,
            originCancelled: stationCancelled(orignStation),
            destinationCancelled: stationCancelled(destinationStation),
            originPlatformChanged: originPlatformChanged ?? false,
            destinationPlatformChanged: destPlatformChanged ?? false,
            originStationId: orignStation,
            originStationName: stationsObject[orignStation]?.[stationLocale] ?? "",
            destinationStationId: destinationStation,
            destinationStationName: stationsObject[destinationStation]?.[stationLocale] ?? "",
            departureTime: new Date(departureTime).getTime(),
            departureTimeString: departureTime,
            arrivalTime: new Date(arrivalTime).getTime(),
            arrivalTimeString: arrivalTime,
            originPlatform: originPlatform,
            destinationPlatform: destPlatform,
            // In rare cases when the API returns "ghost" stations that are not in stationsObject, return an empty string.
            lastStop: stationsObject[lastStationId] ? stationsObject[lastStationId][stationLocale] : "",
            trainNumber,
            stopStations,
            routeStations,
            trainPosition,
            visaWagonData,
          }

          return modifiedTrain
        })

        const departureTime = new Date(route.departureTime).getTime()
        const arrivalTime = new Date(route.arrivalTime).getTime()

        return {
          ...route,
          trains,
          departureTime,
          arrivalTime,
          departureTimeString: route.departureTime,
          arrivalTimeString: route.arrivalTime,
          delay: trains?.[0].delay ?? 0,
          isCancelled: trains.some((train) => train.isCancelled || train.originCancelled || train.destinationCancelled),
          duration: formatRouteDuration(routeDurationInMs(departureTime, arrivalTime)),
          isExchange: trains.length > 1,
          isMuchLonger: false,
          isMuchShorter: false,
        }
      })

      return withDurationFlags(formattedRoutes)
    } catch (err) {
      console.error(err)
      throw err
    }
  }
}

// Filter routes to show today's routes only — except those who are on the next day within 12am - 2am.
const filterRoutes = (requestDate: Date) => {
  return (departureDateISO: string) => {
    const departureDate = new Date(departureDateISO)
    const isToday = isSameDay(departureDate, requestDate)
    const isTomorrow = isSameDay(departureDate, addDays(requestDate, 1))

    if (isToday) return true
    else if (isTomorrow && getHours(departureDate) >= 0 && getHours(departureDate) < 2) return true
    return false
  }
}
