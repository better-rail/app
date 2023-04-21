import { z } from "zod"

import { Provider } from "./notification"
import { LanguageCode } from "../locales/i18n"
import { stationsObject } from "../data/stations"

export const RideRequestSchema = z.object({
  token: z.string(),
  provider: z.nativeEnum(Provider),
  departureDate: z.string().datetime({ offset: true }),
  originId: z.number().refine((value) => stationsObject[value], { message: "Origin station doesn't exist" }),
  destinationId: z.number().refine((value) => stationsObject[value], { message: "Destination station doesn't exist" }),
  trains: z.number().array().nonempty(),
  locale: z.nativeEnum(LanguageCode),
})

export type RideRequest = z.infer<typeof RideRequestSchema>

export const RideSchema = RideRequestSchema.extend({
  rideId: z.string(),
  lastNotificationId: z.number(),
})

export type Ride = z.infer<typeof RideSchema>
