/**
 * The lines a rider travels, from the route they are planning and the ones they keep as favourites:
 * the status list brings those lines up first, and the home screen warns of a disruption in their
 * way. Pure, for the tests.
 */
import { RAIL_LINES, type RailLine, type RailLineId } from "@/data/rail-lines"
import {
  type Disruption,
  type LineStatus,
  type ServiceStatusLevel,
  type ServiceStatusSnapshot,
  compareServiceStatusLevels,
  isDisruptedLevel,
} from "@/services/api"

export type UserRoute = { originId: string; destinationId: string }

type PlannedStation = { id: string } | undefined
type SavedRoute = { originId: string; destinationId: string }

/** The routes the rider travels: the one planned now, then the favourites, each pair once whichever way round. */
export const userRoutes = (
  plan: { origin?: PlannedStation; destination?: PlannedStation },
  favorites: SavedRoute[],
): UserRoute[] => {
  const routes: UserRoute[] = []
  const seen = new Set<string>()
  const add = (originId: string | undefined, destinationId: string | undefined) => {
    if (!originId || !destinationId || originId === destinationId) return
    const key = [originId, destinationId].sort().join("-")
    if (seen.has(key)) return
    seen.add(key)
    routes.push({ originId, destinationId })
  }
  add(plan.origin?.id, plan.destination?.id)
  for (const favorite of favorites) add(favorite.originId, favorite.destinationId)
  return routes
}

/** The lines calling at both ends of the route: the ones a train from the one to the other runs on. */
export const linesServing = (route: UserRoute): RailLine[] =>
  RAIL_LINES.filter((line) => line.stationIds.includes(route.originId) && line.stationIds.includes(route.destinationId))

/** The rider's lines, in the order of their routes, each once. */
export const userLineIds = (routes: UserRoute[]): RailLineId[] => {
  const ids: RailLineId[] = []
  for (const route of routes) {
    for (const line of linesServing(route)) if (!ids.includes(line.id)) ids.push(line.id)
  }
  return ids
}

/** The stations of `line` from one end of the route to the other, inclusive, in the line's order. */
export const routeStretch = (line: RailLine, route: UserRoute): string[] => {
  const a = line.stationIds.indexOf(route.originId)
  const b = line.stationIds.indexOf(route.destinationId)
  if (a < 0 || b < 0) return []
  return line.stationIds.slice(Math.min(a, b), Math.max(a, b) + 1)
}

/**
 * Whether the disruption is in the rider's way on the route: it names a stretch that overlaps the
 * rider's, or it concerns the whole line and is worse than a few minutes' delay (a few late trains
 * somewhere along the line are not worth a warning on the home screen).
 */
export const concernsRoute = (line: RailLine, disruption: Disruption, route: UserRoute): boolean => {
  if (!isDisruptedLevel(disruption.level)) return false
  if (!disruption.section) return disruption.level !== "minorDelays"
  const stretch = routeStretch(line, route)
  return disruption.section.stationIds.some((stationId) => stretch.includes(stationId))
}

export type UserDisruption = { status: LineStatus; disruption: Disruption; route: UserRoute }

/** The disruptions in the rider's way, worst first, each once. */
export const userDisruptions = (
  snapshot: Pick<ServiceStatusSnapshot, "lines"> | undefined,
  routes: UserRoute[],
): UserDisruption[] => {
  if (!snapshot) return []
  const found: UserDisruption[] = []
  const seen = new Set<string>()
  for (const route of routes) {
    for (const line of linesServing(route)) {
      const status = snapshot.lines.find((l) => l.lineId === line.id)
      if (!status) continue
      for (const disruption of status.disruptions) {
        const key = `${line.id}:${disruption.id}`
        if (seen.has(key) || !concernsRoute(line, disruption, route)) continue
        seen.add(key)
        found.push({ status, disruption, route })
      }
    }
  }
  return found.sort((a, b) => compareServiceStatusLevels(b.disruption.level, a.disruption.level))
}

/**
 * The network's level as a traffic light: green while all is well, orange for minor delays, red for
 * anything worse; nothing when nothing runs or nothing is known, so the icon keeps its usual colour.
 */
export const trafficLight = (
  level: ServiceStatusLevel | undefined,
): "goodService" | "minorDelays" | "severeDelays" | undefined => {
  switch (level) {
    case "goodService":
    case "minorDelays":
      return level
    case "severeDelays":
    case "partSuspended":
    case "suspended":
      return "severeDelays"
    default:
      return undefined
  }
}
