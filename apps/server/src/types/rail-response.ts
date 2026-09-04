export type RailApiGetRoutesResult = {
  result: {
    travels: RailApiRouteItem[]
  }
}

type RailApiRouteItem = {
  departureTime: string
  arrivalTime: string
  freeSeats: number
  travelMessages: any[]
  trains: Train[]
}

export interface Train {
  trainNumber: number
  orignStation: number
  destinationStation: number
  originPlatform: number
  destPlatform: number
  freeSeats: number
  arrivalTime: string
  departureTime: string
  stopStations: StopStation[]
  handicap: number
  crowded: number
  trainPosition: any
  routeStations: RouteStation[]
  // Realtime (SIRI) additions — optional so the shape stays a superset of the
  // legacy API's; absent on schedule-only responses and ignored by old clients.
  /** The whole run is cancelled. */
  isCancelled?: boolean
  /** The train now terminates at a different station than scheduled. */
  actualLastStationId?: number
  /** Live platform differs from the scheduled one at the boarding/alighting station. */
  originPlatformChanged?: boolean
  destPlatformChanged?: boolean
}

export interface StopStation {
  stationId: number
  arrivalTime: string
  departureTime: string
  platform: number
  crowded: number
  /** Realtime: live platform differs from the scheduled one. */
  platformChanged?: boolean
  /** Realtime: the train will skip this stop. */
  cancelled?: boolean
}

export interface RouteStation {
  stationId: number
  arrivalTime: string
  crowded: number
  platform: number
  /** Realtime: live platform differs from the scheduled one. */
  platformChanged?: boolean
  /** Realtime: the train will skip this stop. */
  cancelled?: boolean
}
