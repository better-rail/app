import type { NaiveTime } from "@/lib/time"

/** Raw shapes returned by the Better Rail timetable API (the legacy Israel Railways envelope). */
export interface ApiStopStation {
  stationId: number
  arrivalTime: string
  departureTime: string
  platform: number
  crowded: number
  platformChanged?: boolean
  cancelled?: boolean
}

export interface ApiRouteStation {
  stationId: number
  arrivalTime: string
  crowded: number
  platform: number
  platformChanged?: boolean
  cancelled?: boolean
}

export interface ApiTrain {
  trainNumber: number
  orignStation: number
  destinationStation: number
  originPlatform: number
  destPlatform: number
  freeSeats: number
  arrivalTime: string
  departureTime: string
  stopStations: ApiStopStation[]
  handicap: number
  crowded: number
  trainPosition: { calcDiffMinutes: number } | null
  routeStations: ApiRouteStation[]
  isCancelled?: boolean
  actualLastStationId?: number
  originPlatformChanged?: boolean
  destPlatformChanged?: boolean
}

export interface ApiTravel {
  departureTime: string
  arrivalTime: string
  freeSeats: number
  travelMessages: unknown[]
  trains: ApiTrain[]
}

export interface ApiSearchResult {
  result?: { travels: ApiTravel[] }
  error?: string
  message?: string
}

/** Normalised shapes used by the UI. Times are naive Israel wall-clock values (see lib/time). */
export interface StopStation {
  stationId: string
  arrivalTime: NaiveTime
  departureTime: NaiveTime
  platform: number
  platformChanged: boolean
  cancelled: boolean
}

export interface RouteStation {
  stationId: string
  /** `HH:mm` as published by the API */
  arrivalTime: string
  platform: number
  cancelled: boolean
}

export interface Train {
  trainNumber: number
  originStationId: string
  destinationStationId: string
  lastStopId: string
  isLastStopChanged: boolean
  departureTime: NaiveTime
  arrivalTime: NaiveTime
  originPlatform: number
  destinationPlatform: number
  originPlatformChanged: boolean
  destinationPlatformChanged: boolean
  /** Minutes of delay reported by the real-time feed (0 when on time / unknown) */
  delay: number
  isCancelled: boolean
  originCancelled: boolean
  destinationCancelled: boolean
  stopStations: StopStation[]
  routeStations: RouteStation[]
}

export interface RouteItem {
  /** Stable identifier: train numbers joined with the departure time, used in URLs */
  id: string
  departureTime: NaiveTime
  arrivalTime: NaiveTime
  durationMs: number
  delay: number
  isExchange: boolean
  isCancelled: boolean
  isMuchLonger: boolean
  isMuchShorter: boolean
  trains: Train[]
}

export type ResultType = "normal" | "different-date" | "not-found"

export interface RoutesSearch {
  originId: string
  destinationId: string
  /** `YYYY-MM-DD` */
  date: string
  /** `HH:mm` */
  hour: string
  hideSlowTrains?: boolean
}

export interface RoutesResult {
  routes: RouteItem[]
  resultType: ResultType
  /** The date the routes actually belong to (may differ from the requested one) */
  resultDate: string
  requestedDate: string
  fetchedAt: number
}
