export type Station = {
  id: string
  hebrew: string
  english: string
  russian: string
  arabic: string
  alias?: string[]
}

export type RouteItem = {
  delay: number
  isExchange: boolean
  duration: number
  departureTime: number
  arrivalTime: number
  trains: RouteTrain[]
}

export type RouteTrain = {
  originStationId: number
  originStationName: string
  destinationStationId: number
  destinationStationName: string
  arrivalTime: number
  departureTime: number
  originPlatform: number
  destinationPlatform: number
  trainNumber: number
  stopStations: RouteStopStation[]
  lastStop: string
  delay: number
}

export type RouteStopStation = {
  arrivalTime: number
  departureTime: number
  stationId: number
  stationName: string
  platform: number
}
