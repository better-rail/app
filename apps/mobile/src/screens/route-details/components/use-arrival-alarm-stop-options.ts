import { useShallow } from "zustand/react/shallow"
import { useRideStore } from "@/models"
import { getArrivalAlarmStops, getNextStopTrain } from "@/utils/helpers/arrival-alarm-helpers"

/** The stops the rider can choose to ring before. Empty on a route without a transfer. */
export function useArrivalAlarmStopOptions(now: number) {
  const { route, arrivalAlarmStops, rang } = useRideStore(
    useShallow((s) => ({ route: s.route, arrivalAlarmStops: s.arrivalAlarmStops, rang: s.arrivalAlarmRangStops })),
  )
  if (!route || route.trains.length < 2) return []

  const next = getNextStopTrain(route, now)
  const chosen = getArrivalAlarmStops(route, arrivalAlarmStops, now)
  const pending = chosen.filter((train) => !rang.includes(train))

  return route.trains.map((train, index) => {
    const checked = chosen.includes(index)
    return {
      train: index,
      title: train.destinationStationName,
      checked,
      // A stop the train passed or whose alarm rang is done, and the only one left to ring can't be unchecked.
      disabled: next === -1 || index < next || rang.includes(index) || (checked && pending.length === 1 && pending[0] === index),
    }
  })
}
