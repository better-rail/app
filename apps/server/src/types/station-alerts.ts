/**
 * station-alerts.ts — the contract of the station alerts: what a device sends to
 * subscribe (PUT /api/v1/station-alerts) and what the server keeps for it.
 *
 * A subscription is one device (its push token) with the stations it wants to
 * hear about; each station carries the lines the alerts are limited to, or null
 * for every line calling there. The app keeps a mirror of the request types in
 * apps/mobile/src/services/api/station-alerts.types.ts — keep them in sync.
 */
import { z } from "zod"

export const ALERT_PROVIDERS = ["ios", "android"] as const
export type AlertProvider = (typeof ALERT_PROVIDERS)[number]

export const ALERT_LOCALES = ["he", "en", "ru", "ar"] as const
export type AlertLocale = (typeof ALERT_LOCALES)[number]

const StationId = z.string().regex(/^\d+$/)

/** The timetable's days, as the app's map has them: Sun–Thu, Fri–Sat, and the night trains. */
export const DAY_TYPES = ["weekday", "weekend", "night"] as const
export type DayType = (typeof DAY_TYPES)[number]

export const StationAlertChoiceSchema = z.object({
  stationId: StationId,
  /** Catalogue line ids the alerts are limited to; null for every line calling at the station. */
  lineIds: z.array(z.string().min(1)).min(1).max(20).nullable(),
  /** The days the alerts are wanted on; null (or absent, from an older app) for always. */
  dayTypes: z.array(z.enum(DAY_TYPES)).min(1).max(3).nullable().optional(),
})

export const StationAlertSubscriptionSchema = z.object({
  /** The device push token: APNs on iOS, FCM on Android. */
  token: z.string().min(16).max(512),
  provider: z.enum(ALERT_PROVIDERS),
  locale: z.enum(ALERT_LOCALES),
  stations: z.array(StationAlertChoiceSchema).min(1).max(30),
})

export const StationAlertUnsubscribeSchema = z.object({
  token: z.string().min(16).max(512),
})

export type StationAlertChoice = z.infer<typeof StationAlertChoiceSchema>
export type StationAlertSubscription = z.infer<typeof StationAlertSubscriptionSchema>

/** A subscription as stored, with when it was last (re)registered. */
export type StoredSubscription = StationAlertSubscription & { updatedAt: string }
