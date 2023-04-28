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
}

export interface StopStation {
  stationId: number
  arrivalTime: string
  departureTime: string
  platform: number
  crowded: number
}

export interface RouteStation {
  stationId: number
  arrivalTime: string
  crowded: number
  platform: number
}
