/**
 * The station alerts contract — what PUT /api/v1/station-alerts takes. Mirrors
 * apps/server/src/types/station-alerts.ts; keep the two in sync.
 */
import type { LanguageCode } from "@/i18n"
import type { DayType } from "@/data/rail-service-patterns"

/**
 * A station the device wants pushes about: the lines those are limited to (null: every line calling
 * there) and the timetable's days they are wanted on (null: always).
 */
export type StationAlertChoice = {
  stationId: string
  lineIds: string[] | null
  dayTypes: DayType[] | null
}

export type StationAlertSubscription = {
  /** The device push token: APNs on iOS, FCM on Android. */
  token: string
  provider: "ios" | "android"
  locale: LanguageCode
  stations: StationAlertChoice[]
}
