import { Dayjs } from "dayjs"

import { LanguageCode } from "../locales/i18n"

export type Ride = {
  token: string
  departureDate: Date
  originId: number
  destinationId: number
  trains: number[]
  locale: LanguageCode
}

export type NotificationPayload = {
  time: Dayjs
  state: {
    nextStationId: number
    delay: number
    inExchange: boolean
    arrived: boolean
  }
  alert?: {
    title: string
    text: string
  }
}

export type IndexedNotificationPayload = NotificationPayload & {
  id: number
}

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
