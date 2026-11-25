import { logNames, logger } from "../logs"
import { RailApiGetRoutesResult, RailApiRouteItem } from "../types/rail-response"
import { RailTimetableSearch } from "./rail-api"
import { searchViaOnRailApi } from "./rail-via"

/**
 * Changes the Israel Railways API never offers, added to its answers.
 *
 * Out of Jerusalem-Yitzhak Navon, the xx:03 Modi'in train reaches Pa'ate Modi'in
 * at xx:18, and the Modi'in-Center train to the coast and the north leaves there
 * at xx:25. The rail API only offers the xx:26 and xx:56 via Tel Aviv, so someone
 * who missed the xx:56 is told to wait half an hour, when the xx:03 gets them
 * there at the same time or soon after.
 *
 * The opposite direction gains nothing: the rail API already finds the best way
 * back to Jerusalem.
 */

const JERUSALEM_NAVON = 680
const PAATE_MODIIN = 300

// The extra search starts with the rail API's own, and once that one answers, the
// extra one gets at most this much longer. A search a client is waiting on gives
// it a small slice of the client's patience (the website gives a whole search 12
// seconds). Past it, the rail API's own answer goes out unchanged.
const SHORTCUT_BUDGET_MS = 3_000
// Looking up a ride the rider already chose is another matter: a ride on a
// Pa'ate Modi'in change can only be found in the extra search, so giving up on it
// fails the ride. There it gets more than a rail API request's own 10-second
// deadline, while staying with the main search (also 10 s at most) inside the 30
// seconds the app waits for a ride to start.
export const RIDE_LOOKUP_SHORTCUT_BUDGET_MS = 15_000

const epochMs = (time: string) => new Date(time).getTime()

const appliesTo = ({ fromStation, toStation }: RailTimetableSearch) =>
  fromStation === JERUSALEM_NAVON && toStation !== PAATE_MODIIN && toStation !== JERUSALEM_NAVON

/** Leaves no earlier, arrives no later, with no more trains. */
const beats = (a: RailApiRouteItem, b: RailApiRouteItem) =>
  epochMs(a.departureTime) >= epochMs(b.departureTime) &&
  epochMs(a.arrivalTime) <= epochMs(b.arrivalTime) &&
  a.trains.length <= b.trains.length

/**
 * The rail API's travels with the Pa'ate Modi'in changes it missed. A change is
 * added only as one train there and one train on, and only when nothing the rail
 * API offers already beats it.
 *
 * Nothing the rail API offers is ever removed, even a journey an added change
 * beats: apps look up a ride the rider already chose in these same results, by
 * its exact trains, and it has to still be there.
 */
export const mergePaateModiinTravels = (railTravels: RailApiRouteItem[], viaTravels: RailApiRouteItem[]): RailApiRouteItem[] => {
  const added = viaTravels.filter(
    (via) =>
      via.trains.length === 2 &&
      via.trains[0].destinationStation === PAATE_MODIIN &&
      via.trains[1].orignStation === PAATE_MODIIN &&
      !railTravels.some((travel) => beats(travel, via)),
  )
  if (added.length === 0) return railTravels

  return [...railTravels, ...added].sort((a, b) => epochMs(a.departureTime) - epochMs(b.departureTime))
}

/**
 * The Pa'ate Modi'in changes for `search`, looked for right away so the search
 * runs alongside the rail API's own instead of after it: on a date nobody has
 * searched yet, each rail API request takes about two seconds, and one after the
 * other they ran past the budget, so the changes went missing from searches for
 * the coming days.
 *
 * Skips the via search's look into the next day's timetable, a third request
 * made after the first two. A change is only added as one train to Pa'ate
 * Modi'in and one train on, and the last train there from Jerusalem-Yitzhak
 * Navon arrives well before the last one on leaves (21:18 and 22:55 in the
 * November 2026 timetable), so the next day could only add changes never kept.
 *
 * `addTo` returns `railResult` with the changes added. If finding them fails or
 * takes too long, `railResult` is returned as is: the extra options are never
 * worth failing the search over.
 */
export const paateModiinChanges = (search: RailTimetableSearch, budgetMs = SHORTCUT_BUDGET_MS) => {
  const via = appliesTo(search) ? searchViaOnRailApi(search, PAATE_MODIIN, { pastMidnight: false }) : undefined
  // Left unawaited when the rail API's own search fails, so a failure here must not go unhandled.
  via?.catch(() => {})

  return {
    addTo: async (railResult: RailApiGetRoutesResult): Promise<RailApiGetRoutesResult> => {
      const travels = railResult?.result?.travels
      if (!via || !Array.isArray(travels)) return railResult

      let timer: ReturnType<typeof setTimeout> | undefined
      const outOfTime = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new DOMException("The Pa'ate Modi'in search ran out of time", "TimeoutError")), budgetMs)
      })
      try {
        const viaResult = await Promise.race([via, outOfTime])
        return {
          ...railResult,
          result: { ...railResult.result, travels: mergePaateModiinTravels(travels, viaResult.result?.travels ?? []) },
        }
      } catch (error) {
        logger.warn(logNames.railApi.paateModiinShortcutFailed, { error, search })
        return railResult
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
