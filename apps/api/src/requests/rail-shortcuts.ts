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

// The extra search is optional, so it gets a small slice of the time a client
// waits for its timetable (the website gives a whole search 12 seconds). Past it,
// the rail API's own answer goes out unchanged.
const SHORTCUT_BUDGET_MS = 3_000

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
 * `railResult` with the Pa'ate Modi'in changes added when the search leaves
 * Jerusalem-Yitzhak Navon. If finding them fails or takes too long, `railResult`
 * is returned as is: the extra options are never worth failing the search over.
 */
export const withPaateModiinChanges = async (
  search: RailTimetableSearch,
  railResult: RailApiGetRoutesResult,
  budgetMs = SHORTCUT_BUDGET_MS,
): Promise<RailApiGetRoutesResult> => {
  const travels = railResult?.result?.travels
  if (!appliesTo(search) || !Array.isArray(travels)) return railResult

  let timer: ReturnType<typeof setTimeout> | undefined
  const outOfTime = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DOMException("The Pa'ate Modi'in search ran out of time", "TimeoutError")), budgetMs)
  })
  try {
    const via = await Promise.race([searchViaOnRailApi(search, PAATE_MODIIN), outOfTime])
    return {
      ...railResult,
      result: { ...railResult.result, travels: mergePaateModiinTravels(travels, via.result?.travels ?? []) },
    }
  } catch (error) {
    logger.warn(logNames.railApi.paateModiinShortcutFailed, { error, search })
    return railResult
  } finally {
    clearTimeout(timer)
  }
}
