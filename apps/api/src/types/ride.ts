import { z } from "zod"
import dayjs from "dayjs"

import { Provider } from "./notification"
import { LanguageCode } from "../locales/i18n"
import { stationsObject } from "../data/stations"

export const RideRequestSchema = z.object({
  token: z.string().min(1),
  provider: z.nativeEnum(Provider),
  departureDate: z.string().refine((value) => dayjs(value).isValid(), { message: "Departure date isn't valid" }),
  originId: z.number().refine((value) => stationsObject[value], { message: "Origin station doesn't exist" }),
  destinationId: z.number().refine((value) => stationsObject[value], { message: "Destination station doesn't exist" }),
  trains: z.number().array().nonempty(),
  locale: z.nativeEnum(LanguageCode),
  viaStationId: z
    .number()
    .refine((value) => stationsObject[value], { message: "Via station doesn't exist" })
    .optional(),
})

export type RideRequest = z.infer<typeof RideRequestSchema>

export const RideAlarmRequestSchema = z.object({
  // The app's own APNs token: the ride token belongs to the Live Activity, whose pushes never reach app code.
  token: z.string().min(1),
  alarmId: z.string().uuid(),
  leadMinutes: z.number().int().min(1).max(30),
  locale: z.nativeEnum(LanguageCode),
  /** The trains to ring before getting off, by their index in the route: a transfer, the destination, or both */
  stops: z.number().int().min(0).max(10).array().nonempty(),
})

export type RideAlarmRequest = z.infer<typeof RideAlarmRequestSchema>

export const RideAlarmStopSchema = z.object({
  /** The train the rider gets off, by its index in the route */
  train: z.number(),
  /** When the alarm on the device rings, in ms */
  fireDate: z.number(),
})

export type RideAlarmStop = z.infer<typeof RideAlarmStopSchema>

export const RideAlarmSchema = RideAlarmRequestSchema.extend({
  stops: RideAlarmStopSchema.array(),
})

export type RideAlarm = z.infer<typeof RideAlarmSchema>

export const RideSchema = RideRequestSchema.extend({
  rideId: z.string().min(1),
  lastNotificationId: z.number(),
  alarm: RideAlarmSchema.optional(),
})

export type Ride = z.infer<typeof RideSchema>
