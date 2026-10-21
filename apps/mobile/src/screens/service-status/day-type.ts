/**
 * Which of the timetable's days (Sun–Thu, Fri–Sat, nights) a line or a station is shown on: today's,
 * unless nothing runs there today, in which case the first day something does.
 */
import { currentDayType } from "@/components/rail-map/rail-map-model"
import type { RailLineId } from "@/data/rail-lines"
import { DAY_TYPES, type DayType, SERVICE_PATTERNS } from "@/data/rail-service-patterns"
import { linesCallingAt } from "./station-status"

/** The day's timetable the line runs on: today's if it does, else the first it runs on. */
export const dayTypeForLine = (lineId: string, now?: Date): DayType => {
  const today = currentDayType(now)
  const runsOn = (type: DayType) => SERVICE_PATTERNS[type].lines.includes(lineId as RailLineId)
  if (runsOn(today)) return today
  return DAY_TYPES.find(runsOn) ?? today
}

/** The day's timetable a line calls at the station on: today's if one does, else the first one does. */
export const dayTypeForStation = (stationId: string, now?: Date): DayType => {
  const today = currentDayType(now)
  if (linesCallingAt(stationId, today).length > 0) return today
  return DAY_TYPES.find((type) => linesCallingAt(stationId, type).length > 0) ?? today
}
