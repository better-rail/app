/**
 * delay-guards.ts — the contract of Delay Guard: a train the rider usually takes,
 * boarded at a station, to be told about when it runs late enough that they could
 * still catch it (PUT /api/v1/delay-guards).
 *
 * A subscription is one device with its guards. The app keeps a mirror of the
 * request types in apps/mobile/src/services/api/delay-guards.types.ts — keep them
 * in sync.
 */
import { z } from "zod"

import { ALERT_LOCALES, ALERT_PROVIDERS } from "./station-alerts"

const StationId = z.string().regex(/^\d+$/)

export const DEFAULT_GUARD_MINUTES = 3

export const DelayGuardSchema = z.object({
  trainNumber: z.number().int().positive(),
  /** Where the rider boards: the delay that matters is the one there. */
  originStationId: StationId,
  /** Where they get off, for the words of the push. */
  destinationStationId: StationId,
  /** Scheduled departure from the origin, "HH:MM", for the words when the schedule cannot be had. */
  departureTime: z.string().regex(/^\d{2}:\d{2}$/),
  /** Minutes late from which the rider wants to hear. */
  thresholdMinutes: z.number().int().min(1).max(60),
})

export const DelayGuardSubscriptionSchema = z.object({
  token: z.string().min(16).max(512),
  provider: z.enum(ALERT_PROVIDERS),
  locale: z.enum(ALERT_LOCALES),
  guards: z.array(DelayGuardSchema).min(1).max(20),
})

export const DelayGuardUnsubscribeSchema = z.object({
  token: z.string().min(16).max(512),
})

export type DelayGuard = z.infer<typeof DelayGuardSchema>
export type DelayGuardSubscription = z.infer<typeof DelayGuardSubscriptionSchema>
export type StoredGuardSubscription = DelayGuardSubscription & { updatedAt: string }

/** One guard per train and boarding station. */
export const guardKey = (guard: Pick<DelayGuard, "trainNumber" | "originStationId">): string =>
  `${guard.trainNumber}@${guard.originStationId}`
