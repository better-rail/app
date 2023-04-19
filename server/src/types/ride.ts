import { LanguageCode } from "../locales/i18n"

export type RideRequest = {
  token: string
  departureDate: Date
  originId: number
  destinationId: number
  trains: number[]
  locale: LanguageCode
}

export type Ride = RideRequest & {
  rideId: string
  lastNotificationId: number
}
