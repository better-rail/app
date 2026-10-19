import { addMinutes, subMinutes } from "date-fns"
import type { RouteItem } from "@/services/api"

export type ArrivalAlarmStop = {
  /** The train the rider gets off, by its index in the route */
  train: number
  /** When it rings, in ms */
  fireDate: number
}

/** When a stop's alarm should ring: `leadMinutes` before its train's actual (delayed) arrival, in ms */
export function getArrivalAlarmFireDate(route: RouteItem, train: number, leadMinutes: number) {
  const { arrivalTime, departureTime, delay } = route.trains[train]
  // A train ride shorter than the lead time rings as it departs, not at the stop before.
  return addMinutes(Math.max(subMinutes(arrivalTime, leadMinutes).getTime(), departureTime), delay).getTime()
}

/** The first train that hasn't reached its stop yet, delays included, or -1 once the ride arrived */
export function getNextStopTrain(route: RouteItem, now = Date.now()) {
  return route.trains.findIndex((train) => addMinutes(train.arrivalTime, train.delay).getTime() > now)
}

/** The stops to ring before, by train: the rider's choice while it has a stop ahead, otherwise the next stop */
export function getArrivalAlarmStops(route: RouteItem, chosen: number[] | undefined, now = Date.now()) {
  const next = getNextStopTrain(route, now)
  if (next === -1) return []

  const ahead = chosen?.filter((train) => train >= next && train < route.trains.length) ?? []
  return ahead.length > 0 ? ahead : [next]
}

/** The stops after checking or unchecking one, or undefined when that would leave none */
export function toggleArrivalAlarmStop(stops: number[], train: number) {
  const toggled = stops.includes(train) ? stops.filter((stop) => stop !== train) : [...stops, train].sort((a, b) => a - b)
  return toggled.length > 0 ? toggled : undefined
}

/** The stop that rings next, or the last one once they all rang */
export function getNextArrivalAlarmStop(stops: ArrivalAlarmStop[], now = Date.now()) {
  return stops.find((stop) => stop.fireDate > now) ?? stops[stops.length - 1]
}
