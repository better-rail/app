import { useShallow } from "zustand/react/shallow"
import { useRideStore } from "@/models"
import { getArrivalAlarmStops, getNextStopTrain } from "@/utils/helpers/arrival-alarm-helpers"

/** The stops the rider can choose to ring before. Empty on a route without a transfer. */
export function useArrivalAlarmStopOptions(now: number) {
  const { route, arrivalAlarmStops } = useRideStore(
    useShallow((s) => ({ route: s.route, arrivalAlarmStops: s.arrivalAlarmStops })),
  )
  if (!route || route.trains.length < 2) return []

  const next = getNextStopTrain(route, now)
  const chosen = getArrivalAlarmStops(route, arrivalAlarmStops, now)

  return route.trains.map((train, index) => {
    const checked = chosen.includes(index)
    return {
      train: index,
      title: train.destinationStationName,
      checked,
      // A stop the train passed can't ring anymore, and the only one left can't be unchecked.
      disabled: next === -1 || index < next || (checked && chosen.length === 1),
    }
  })
}
