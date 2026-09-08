import { parse } from "date-fns"
import { stationLocale, stationsObject } from "@/data/stations"
import type { RouteItem, RouteStation, Train, VisaWagonData } from "./rail-api.types"

const MINUTE = 60_000
const TIMETABLE_INTERVAL_MINUTES = 30
const EXCHANGE_STATION_ID = 3700

const routeStation = (stationId: number, time: number, platform: number): RouteStation => ({
  stationId,
  arrivalTime: new Date(time).toISOString(),
  crowded: 0,
  platform,
})

const wagonData: VisaWagonData = {
  totkr: 4,
  kvsgkR_MOVIL: "EMU",
  kvsgkR_LAST: "EMU",
  seatplaces: 412,
  updateDate: "",
  updateTime: "",
  wagons: [
    {
      krsid: 1,
      shurA2: 1,
      krsG3: "EMU",
      wagoN_TEUR_DISPLAY: "",
      kvsgkr: "EMU",
      handicapped: false,
      bicycle: true,
    },
    {
      krsid: 2,
      shurA2: 2,
      krsG3: "EMU",
      wagoN_TEUR_DISPLAY: "",
      kvsgkr: "EMU",
      handicapped: true,
      bicycle: false,
    },
    {
      krsid: 3,
      shurA2: 3,
      krsG3: "EMU",
      wagoN_TEUR_DISPLAY: "",
      kvsgkr: "EMU",
      handicapped: false,
      bicycle: false,
    },
    {
      krsid: 4,
      shurA2: 4,
      krsG3: "EMU",
      wagoN_TEUR_DISPLAY: "",
      kvsgkr: "EMU",
      handicapped: false,
      bicycle: false,
    },
  ],
}

function stationName(stationId: number) {
  return stationsObject[stationId]?.[stationLocale] ?? String(stationId)
}

function train({
  trainNumber,
  originId,
  destinationId,
  departureTime,
  arrivalTime,
  originPlatform,
  destinationPlatform,
}: {
  trainNumber: number
  originId: number
  destinationId: number
  departureTime: number
  arrivalTime: number
  originPlatform: number
  destinationPlatform: number
}): Train {
  return {
    originStationId: originId,
    originStationName: stationName(originId),
    destinationStationId: destinationId,
    destinationStationName: stationName(destinationId),
    departureTime,
    departureTimeString: new Date(departureTime).toISOString(),
    arrivalTime,
    arrivalTimeString: new Date(arrivalTime).toISOString(),
    originPlatform,
    destinationPlatform,
    trainNumber,
    stopStations: [],
    lastStop: stationName(destinationId),
    isLastStopChanged: false,
    isCancelled: false,
    originCancelled: false,
    destinationCancelled: false,
    originPlatformChanged: false,
    destinationPlatformChanged: false,
    delay: 0,
    trainPosition: { calcDiffMinutes: 0 },
    routeStations: [
      routeStation(originId, departureTime, originPlatform),
      routeStation(destinationId, arrivalTime, destinationPlatform),
    ],
    visaWagonData: wagonData,
  }
}

function route(
  trains: Train[],
  duration: string,
  flags: Pick<RouteItem, "isMuchLonger" | "isMuchShorter"> = { isMuchLonger: false, isMuchShorter: false },
): RouteItem {
  const departureTime = trains[0].departureTime
  const arrivalTime = trains[trains.length - 1].arrivalTime

  return {
    delay: 0,
    isExchange: trains.length > 1,
    duration,
    departureTime,
    departureTimeString: new Date(departureTime).toISOString(),
    arrivalTime,
    arrivalTimeString: new Date(arrivalTime).toISOString(),
    ...flags,
    isCancelled: false,
    trains,
  }
}

function nextTimetableDeparture(requestedTime: number, minuteOffset: number) {
  const departure = new Date(requestedTime)
  const minutesIntoInterval = departure.getMinutes() % TIMETABLE_INTERVAL_MINUTES
  const waitMinutes = (minuteOffset - minutesIntoInterval + TIMETABLE_INTERVAL_MINUTES) % TIMETABLE_INTERVAL_MINUTES

  departure.setSeconds(0, 0)
  departure.setMinutes(departure.getMinutes() + waitMinutes)
  return departure.getTime()
}

/**
 * Stable timetable data for Maestro. Times follow the requested date/hour so the
 * production route-list grouping and closest-train logic are still exercised.
 */
export function getE2ERoutes(
  originId: string,
  destinationId: string,
  date: string,
  hour: string,
  options: { hideSlowTrains?: boolean } = {},
): RouteItem[] {
  const origin = Number(originId)
  const destination = Number(destinationId)
  const requestedTime = parse(`${date} ${hour}`, "yyyy-MM-dd HH:mm", new Date()).getTime()

  const directDeparture = nextTimetableDeparture(requestedTime, 10)
  const directArrival = directDeparture + 32 * MINUTE
  const exchangeDeparture = nextTimetableDeparture(requestedTime, 20)
  const exchangeArrival = exchangeDeparture + 55 * MINUTE
  const exchangeTime = exchangeDeparture + 27 * MINUTE

  const routes = [
    route(
      [
        train({
          trainNumber: 9001,
          originId: origin,
          destinationId: destination,
          departureTime: directDeparture,
          arrivalTime: directArrival,
          originPlatform: 3,
          destinationPlatform: 2,
        }),
      ],
      "32 min",
    ),
    route(
      [
        train({
          trainNumber: 9002,
          originId: origin,
          destinationId: EXCHANGE_STATION_ID,
          departureTime: exchangeDeparture,
          arrivalTime: exchangeTime - 4 * MINUTE,
          originPlatform: 1,
          destinationPlatform: 4,
        }),
        train({
          trainNumber: 9003,
          originId: EXCHANGE_STATION_ID,
          destinationId: destination,
          departureTime: exchangeTime,
          arrivalTime: exchangeArrival,
          originPlatform: 5,
          destinationPlatform: 2,
        }),
      ],
      "55 min",
      { isMuchLonger: true, isMuchShorter: false },
    ),
  ].sort((a, b) => a.departureTime - b.departureTime)

  return options.hideSlowTrains ? routes.filter((route) => !route.isMuchLonger) : routes
}
