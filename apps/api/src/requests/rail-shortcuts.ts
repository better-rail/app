import { logNames, logger } from "../logs"
import { RailApiGetRoutesResult, RailApiRouteItem } from "../types/rail-response"
import { RailTimetableSearch } from "./rail-api"
import { searchViaOnRailApi } from "./rail-via"

/**
 * Changes the Israel Railways API never offers, added to its answers.
 *
 * Out of Jerusalem-Yitzhak Navon, the xx:03 Modi'in train reaches Pa'ate Modi'in
 * at xx:18, and the Modi'in-Center train to the coast and the north leaves there
 * at xx:25. The rail API only offers the xx:26 and xx:56 via
 * Tel Aviv, so in the middle of the day someone who missed the xx:56 is told to
 * wait half an hour, when the xx:03 catches the very train the xx:56 changes onto
 * at Tel Aviv University and arrives at the same minute.
 *
 * The opposite direction gains nothing: the rail API already finds the best way
 * back to Jerusalem.
 */

const JERUSALEM_NAVON = 680
const PAATE_MODIIN = 300

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
 * API offers already beats it. A rail API journey the change beats is dropped,
 * unless it is a direct train: those always stay.
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

  const kept = railTravels.filter((travel) => travel.trains.length === 1 || !added.some((via) => beats(via, travel)))
  return [...kept, ...added].sort((a, b) => epochMs(a.departureTime) - epochMs(b.departureTime))
}

/**
 * `railResult` with the Pa'ate Modi'in changes added when the search leaves
 * Jerusalem-Yitzhak Navon. If finding them fails, `railResult` is returned as is:
 * the extra options are never worth failing the search over.
 */
export const withPaateModiinChanges = async (
  search: RailTimetableSearch,
  railResult: RailApiGetRoutesResult,
): Promise<RailApiGetRoutesResult> => {
  const travels = railResult?.result?.travels
  if (!appliesTo(search) || !Array.isArray(travels)) return railResult

  try {
    const via = await searchViaOnRailApi(search, PAATE_MODIIN)
    return {
      ...railResult,
      result: { ...railResult.result, travels: mergePaateModiinTravels(travels, via.result?.travels ?? []) },
    }
  } catch (error) {
    logger.warn(logNames.railApi.paateModiinShortcutFailed, { error, search })
    return railResult
  }
}
