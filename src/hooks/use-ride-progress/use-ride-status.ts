import { getRideStatus, getTrainFromStationId } from "@/utils/helpers/ride-helpers"

export function useRideStatus({ route, delay, nextStationId }) {
  const status = (() => {
    const train = getTrainFromStationId(route, nextStationId)
    return getRideStatus(route, train, nextStationId, delay)
  })()

  return status
}
