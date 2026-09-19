/**
 * The Delay Guard contract — what PUT /api/v1/delay-guards takes. Mirrors
 * apps/server/src/types/delay-guards.ts; keep the two in sync.
 */
import type { LanguageCode } from "@/i18n"

/** A train the user usually takes, to be told about when it runs late enough that they could still catch it. */
export type DelayGuard = {
  trainNumber: number
  /** Where the user boards: the delay that matters is the one there. */
  originStationId: string
  destinationStationId: string
  /** Scheduled departure from the origin, "HH:mm". */
  departureTime: string
  /** Minutes late from which to notify. */
  thresholdMinutes: number
}

export type DelayGuardSubscription = {
  token: string
  provider: "ios" | "android"
  locale: LanguageCode
  guards: DelayGuard[]
}

export const DEFAULT_GUARD_MINUTES = 3
/** The thresholds the user picks from. */
export const GUARD_MINUTES_OPTIONS = [1, 2, 3, 5, 10, 15]

/** One guard per train and boarding station. */
export const guardKey = (guard: Pick<DelayGuard, "trainNumber" | "originStationId">): string =>
  `${guard.trainNumber}@${guard.originStationId}`
