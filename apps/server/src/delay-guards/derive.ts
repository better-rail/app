/**
 * derive.ts — whether a guarded train is late enough to tell its rider, and
 * whether they have been told. Pure (see tests/delay-guards.test.ts).
 *
 * The delay that matters is the one at the boarding station, from the SIRI
 * feed through the planner's lookup. A push goes out once the delay has held
 * at or above the rider's threshold for a check cycle, again if it then grows
 * by a few minutes more (a few times at most), and once if the train is
 * cancelled. Nothing is said before the watch window opens, or once the train
 * has left the station. Each service date starts afresh.
 *
 * The window is kept short on purpose: a delay read an hour or more ahead is
 * often gone by departure, and a rider told early would plan around a number
 * that no longer holds. It opens ten minutes before the scheduled departure,
 * plus the minutes the rider is willing to be late by, since that is how much
 * later they may plan to leave.
 */
import type { TripData } from "../requests/gtfs-route-api"
import type { RealtimeLookup } from "../siri/types"
import type { DelayGuard } from "../types/delay-guards"

/** How long before the scheduled departure the train is watched, on top of the rider's threshold. */
export const WATCH_LEAD_MS = 10 * 60_000
/** When the watch opens for a guard: its lead plus the threshold, before the scheduled departure. */
export const watchBeforeMs = (thresholdMinutes: number): number => WATCH_LEAD_MS + thresholdMinutes * 60_000
/** How long after the (delayed) departure the train still counts as catchable. */
export const WATCH_AFTER_MS = 5 * 60_000
/** A delay has to be seen this long before it is pushed. */
export const CONFIRM_MS = 60_000
/** A delay already told about is told again once it has grown by this much. */
export const REGROWTH_MIN = 5
/** Pushes about one train's delay in a day, at most. */
export const MAX_DELAY_PUSHES = 3

export type GuardState =
  | { status: "outsideWindow" }
  | {
      status: "watching"
      serviceDate: string
      /** Scheduled departure from the boarding station, naive epoch ms. */
      scheduledDepTs: number
      delayMin: number
      cancelled: boolean
      /** Whether the live feed is up (else the delay is the schedule's zero, which says nothing). */
      live: boolean
    }

/** The trips of the guarded train on the days in view, with their service dates. */
export type GuardedTrip = { serviceDate: string; trip: TripData }

/**
 * The train's state for the guard right now: which of the day's runs is in its watch window (a train
 * number runs once a day, but yesterday's run may still be around after midnight), and how late it is
 * at the boarding station.
 */
export const deriveGuardState = (
  guard: DelayGuard,
  trips: GuardedTrip[],
  lookup: RealtimeLookup,
  live: boolean,
  nowNaiveMs: number,
): GuardState => {
  const origin = Number(guard.originStationId)
  for (const { serviceDate, trip } of trips) {
    const stop = trip.stops.find((s) => s.railId === origin)
    if (!stop) continue
    const rt = lookup(serviceDate, trip.trainNumber, origin)
    const delayMin = rt.delayMin
    const cancelled = rt.trainCancelled === true || rt.status === "cancelled"
    const opensAt = stop.depTs - watchBeforeMs(guard.thresholdMinutes)
    const closesAt = stop.depTs + delayMin * 60_000 + WATCH_AFTER_MS
    if (nowNaiveMs < opensAt || nowNaiveMs > closesAt) continue
    return { status: "watching", serviceDate, scheduledDepTs: stop.depTs, delayMin, cancelled, live }
  }
  return { status: "outsideWindow" }
}

/** What the rider was told about the train today. Kept between checks. */
export type GuardMemory = {
  serviceDate: string
  /** The delay last pushed, and how many delay pushes went out today. */
  toldDelayMin?: number
  delayPushes?: number
  toldCancelled?: boolean
  /** A delay at or over the threshold seen but not yet held long enough. */
  candidate?: { delayMin: number; since: number }
}

export type GuardPush = { kind: "delayed" | "cancelled"; delayMin: number }

export type GuardDecision = { memory: GuardMemory | undefined; push?: GuardPush }

export const decideGuard = (
  previous: GuardMemory | undefined,
  state: GuardState,
  guard: DelayGuard,
  nowMs: number,
): GuardDecision => {
  if (state.status === "outsideWindow") return { memory: previous }
  // A new day, or the first sighting: start afresh.
  const memory: GuardMemory = previous?.serviceDate === state.serviceDate ? { ...previous } : { serviceDate: state.serviceDate }

  if (state.cancelled) {
    delete memory.candidate
    if (memory.toldCancelled) return { memory }
    memory.toldCancelled = true
    return { memory, push: { kind: "cancelled", delayMin: state.delayMin } }
  }

  const worthTelling =
    state.live &&
    state.delayMin >= guard.thresholdMinutes &&
    (memory.toldDelayMin === undefined || state.delayMin >= memory.toldDelayMin + REGROWTH_MIN) &&
    (memory.delayPushes ?? 0) < MAX_DELAY_PUSHES
  if (!worthTelling) {
    delete memory.candidate
    return { memory }
  }

  // The delay has to hold; a bigger one restarts the count only if it is a different story (grown again).
  const candidate =
    memory.candidate && state.delayMin >= memory.candidate.delayMin
      ? memory.candidate
      : { delayMin: state.delayMin, since: nowMs }
  memory.candidate = candidate
  if (nowMs - candidate.since < CONFIRM_MS) return { memory }

  delete memory.candidate
  memory.toldDelayMin = state.delayMin
  memory.delayPushes = (memory.delayPushes ?? 0) + 1
  return { memory, push: { kind: "delayed", delayMin: state.delayMin } }
}
