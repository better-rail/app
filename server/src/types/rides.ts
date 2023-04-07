import { LanguageCode } from "../locales/i18n"

export type Ride = {
  token: string
  departureDate: Date
  originId: number
  destinationId: number
  trains: number[]
  locale: LanguageCode
  lastNotificationId: number
}
