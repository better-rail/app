/**
 * The lines a station's alerts can be limited to, and how a tap on one changes the choice. Pure,
 * for the tests; the card (components/station-alerts-card.tsx) is the UI over it.
 */
import { RAIL_LINES, type RailLine } from "@/data/rail-lines"
import { DAY_TYPES } from "@/data/rail-service-patterns"
import { linesCallingAt } from "./station-status"

/** The lines that call at the station on any of the day's timetables, in catalogue order. */
export const alertLinesFor = (stationId: string): RailLine[] => {
  const ids = new Set(DAY_TYPES.flatMap((day) => linesCallingAt(stationId, day).map((line) => line.id)))
  return RAIL_LINES.filter((line) => ids.has(line.id))
}

/**
 * A choice among `all` after one of them was tapped: from every one (null) to just that one; then it
 * joins or leaves the set. A set that empties, or grows to every one, means every one again. Used for
 * the lines and for the days.
 */
export const toggleChoice = <T extends string>(chosen: T[] | null, id: T, all: T[]): T[] | null => {
  const next = chosen === null ? [id] : chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]
  if (next.length === 0 || all.every((x) => next.includes(x))) return null
  return all.filter((x) => next.includes(x))
}
