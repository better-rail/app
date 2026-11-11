/**
 * device.ts — what a device syncs to its DeviceDO, and what the object keeps.
 *
 * A device has no account: it is an anonymous id plus a secret it generated itself (both kept in the
 * Keychain / Keystore). The device is the source of truth for its own state, so every sync replaces the
 * whole state; the server only adds the secret's hash and the timestamps.
 */
import { z } from "zod"
import dayjs from "dayjs"

import { LanguageCode } from "../locales/i18n"
import { stationsObject } from "../data/stations"

// Client arrays and strings need an upper bound: zod only rejects an oversized array before walking its elements
// when it has one (GHSA-mrhx-c7xc-m3w5), and every byte here is kept in storage.
export const MAX_RECURRING_RIDES = 10
const MAX_SKIP_DATES = 60
const MAX_TOKEN_LENGTH = 1024

export const DEVICE_ID_HEADER = "x-device-id"

/** The device id: a v4 UUID the app generated. */
export const DeviceIdSchema = z.uuid()
/** The device secret: 32 random bytes, hex encoded. */
export const DeviceSecretSchema = z.string().regex(/^[0-9a-f]{64}$/)

const station = (message: string) => z.number().refine((value) => stationsObject[value], { error: message })

/** "HH:mm", 24-hour, Israel time. */
const TimeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Time must be HH:mm" })

/** "YYYY-MM-DD", a real calendar date. */
const CalendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => dayjs(value).format("YYYY-MM-DD") === value, { error: "Date isn't valid" })

export const RecurringRideSchema = z
  .object({
    id: z.uuid(),
    originId: station("Origin station doesn't exist"),
    destinationId: station("Destination station doesn't exist"),
    viaStationId: station("Via station doesn't exist").optional(),
    departureTime: TimeOfDay,
    /** Weekdays the ride repeats on, 0 = Sunday … 6 = Saturday */
    days: z
      .number()
      .int()
      .min(0)
      .max(6)
      .array()
      .nonempty()
      .max(7)
      .refine((days) => new Set(days).size === days.length, { error: "Days must be unique" }),
    /** How long before departure the ride starts (or the reminder goes out) */
    leadMinutes: z.number().int().min(0).max(120),
    /** `auto` starts the live ride by itself (push-to-start / FCM); `notify` sends a reminder */
    mode: z.enum(["auto", "notify"]),
    enabled: z.boolean(),
    /** Single dates the ride is skipped on (a holiday, a day off) */
    skipDates: CalendarDate.array().max(MAX_SKIP_DATES),
  })
  .refine((ride) => ride.originId !== ride.destinationId, { error: "Origin and destination must differ" })

export type RecurringRide = z.infer<typeof RecurringRideSchema>

const Token = z.string().min(1).max(MAX_TOKEN_LENGTH)

export const DeviceTokensSchema = z.object({
  /** The iOS Live Activity push-to-start token */
  pushToStart: Token.optional(),
  /** The app's own APNs token */
  apns: Token.optional(),
  /** The app's FCM registration token */
  fcm: Token.optional(),
})

/** The body of `PUT /device`: the device's whole state. */
export const DeviceStateSchema = z.object({
  platform: z.enum(["ios", "android"]),
  locale: z.enum(LanguageCode),
  appVersion: z.string().min(1).max(32),
  tokens: DeviceTokensSchema,
  supportsPushToStart: z.boolean(),
  recurringRides: RecurringRideSchema.array()
    .max(MAX_RECURRING_RIDES)
    .refine((rides) => new Set(rides.map((ride) => ride.id)).size === rides.length, { error: "Ride ids must be unique" }),
})

export type DeviceState = z.infer<typeof DeviceStateSchema>

/** What a DeviceDO keeps: the synced state plus the secret's hash and the timestamps, in ms. */
export type DeviceRecord = DeviceState & {
  /** sha256 of the device secret, hex encoded */
  secretHash: string
  createdAt: number
  lastSyncAt: number
}
