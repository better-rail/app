import { useMemo } from "react"
import { getRideStatus, getTrainFromStationId } from "../../utils/helpers/ride-helpers"

export function useRideStatus({ route, delay, nextStationId }) {
  const status = useMemo(() => {
    const train = getTrainFromStationId(route, nextStationId)
    return getRideStatus(route, train, nextStationId, delay)
  }, [route, nextStationId, delay])

  return status
}
