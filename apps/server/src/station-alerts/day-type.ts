/**
 * day-type.ts — which of the timetable's days it is, the way the app's map decides
 * (apps/mobile/src/components/rail-map/rail-map-model.ts currentDayType): the small
 * hours after a Sunday–Thursday are the night trains until the morning service
 * starts at 04:30; otherwise the service day (which runs past midnight) is a
 * weekend one on Friday and Saturday.
 */
import type { DayType } from "../types/station-alerts"

/** When the night timetable gives way to the morning one, in minutes past midnight. */
const NIGHT_UNTIL_MINUTES = 4 * 60 + 30
const SERVICE_DAY_OFFSET_MS = 3 * 60 * 60_000

/** For a naive Israel wall-clock epoch (see siri/correlate.ts naiveNowMs), whose fields read as UTC. */
export const currentDayType = (nowNaiveMs: number): DayType => {
  const now = new Date(nowNaiveMs)
  const weekday = now.getUTCDay()
  if (weekday >= 1 && weekday <= 5 && now.getUTCHours() * 60 + now.getUTCMinutes() < NIGHT_UNTIL_MINUTES) return "night"
  const serviceDay = new Date(nowNaiveMs - SERVICE_DAY_OFFSET_MS).getUTCDay()
  return serviceDay === 5 || serviceDay === 6 ? "weekend" : "weekday"
}
