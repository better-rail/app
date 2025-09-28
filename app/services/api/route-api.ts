import { railApi } from "./rail-api"
import { AxiosResponse } from "axios"
import { stationsObject, stationLocale } from "../../data/stations"
import { RailApiGetRoutesResult } from "./rail-api.types"
import { formatRouteDuration, isOneHourDifference, routeDurationInMs } from "../../utils/helpers/date-helpers"
import { RouteItem } from "."
import { getHours, parse, isSameDay, addDays } from "date-fns"
import { findClosestStationInRoute, getTrainFromStationId } from "../../utils/helpers/ride-helpers"

export class RouteApi {
  private api = railApi

  async getRoutes(originId: string, destinationId: string, date: string, hour: string): Promise<RouteItem[]> {
    if (!originId || !destinationId) throw new Error("Missing origin / destination data")

    try {
      const response: AxiosResponse<RailApiGetRoutesResult> = await this.api.axiosInstance.get(
        `/rjpa/api/v1/timetable/searchTrainLuzForDateTime?fromStation=${originId}&toStation=${destinationId}&date=${date}&hour=${hour}&scheduleType=1&systemType=1&languageId=Hebrew`,
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
          } = train

          const stopStations = train.stopStations.map((station) => {
            const { stationId } = station
            const stationName = stationsObject[stationId][stationLocale]

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
          const lastStationId = routeStations[routeStations.length - 1].stationId

          const modifiedTrain = {
            delay: trainPosition?.calcDiffMinutes ?? 0,
            originStationId: orignStation,
            originStationName: stationsObject[orignStation][stationLocale],
            destinationStationId: destinationStation,
            destinationStationName: stationsObject[destinationStation][stationLocale],
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
          duration: formatRouteDuration(routeDurationInMs(departureTime, arrivalTime)),
          isExchange: trains.length > 1,
        }
      })

      const routesWithWarning = formattedRoutes.map((route) => {
        const nextStationId = findClosestStationInRoute(route as RouteItem)
        const train = getTrainFromStationId(route as RouteItem, nextStationId)

        const delay = train.delay
        const isMuchLonger = isRouteIsMuchLongerThanOtherRoutes(route as RouteItem, formattedRoutes as RouteItem[])
        const isMuchShorter = isRouteMuchShorterThanOtherRoutes(route as RouteItem, formattedRoutes as RouteItem[])
        return Object.assign({}, route, { isMuchShorter, isMuchLonger, delay })
      })

      return routesWithWarning
    } catch (err) {
      console.error(err)
    }
  }
}

function isRouteIsMuchLongerThanOtherRoutes(route: RouteItem, otherRoutes: RouteItem[]): boolean {
  const routeDuration = routeDurationInMs(route.departureTime, route.arrivalTime)

  // TODO: Iterate only on the routes that are 1 hour around the route
  // currently we iterating on all the routes which is unecessary

  // iterate on routes that are before and after 1 hour the current route,
  // and check if they're shorther by 30 minutes or more than the current route.
  const longRoutesAround = otherRoutes.filter((otherRoute) => {
    const withinRange = isOneHourDifference(route.trains[0].departureTime, otherRoute.trains[0].departureTime)
    if (!withinRange) return false

    // check if the other route is much longer than the current route
    const otherRouteDuration = routeDurationInMs(otherRoute.departureTime, otherRoute.arrivalTime)

    // Usually, we only show the user a long route warning if there is a difference of 30 minutes.
    // When the current route involves a change and the other does not, we want to reduce the difference
    // to 15 minutes so that people will choose a more comfortable journey.
    const minutesForMuchLonger = route.isExchange && !otherRoute.isExchange ? 15 : 30
    return routeDuration - otherRouteDuration >= minutesForMuchLonger * 60 * 1000
  })

  if (longRoutesAround.length > 0) return true
  return false
}

function isRouteMuchShorterThanOtherRoutes(route: RouteItem, otherRoutes: RouteItem[]): boolean {
  const routeDuration = routeDurationInMs(route.departureTime, route.arrivalTime)

  const shortRoutesAround = otherRoutes.filter((otherRoute) => {
    const withinRange = isOneHourDifference(route.trains[0].departureTime, otherRoute.trains[0].departureTime)
    if (!withinRange) return false

    // check if the other route is much shorter than the current route
    const otherRouteDuration = routeDurationInMs(otherRoute.departureTime, otherRoute.arrivalTime)

    // Usually, we only show that a shorter route is available if there is a difference of 30 minutes.
    // When the other route involves a change and the current does not, we want to reduce the difference
    // to 15 minutes so that people will choose a more comfortable journey.
    const minutesForMuchShorter = !route.isExchange && otherRoute.isExchange ? 15 : 30
    return otherRouteDuration - routeDuration >= minutesForMuchShorter * 60 * 1000
  })

  if (shortRoutesAround.length > 0) return true
  return false
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
