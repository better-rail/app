import { useEffect, useState } from "react"
import { RideStatus } from "./use-ride-progress"
import { getTrainFromStationId } from "../../utils/helpers/ride-helpers"

export function useRideStatus({ route, delay, nextStationId }) {
  const [status, setStatus] = useState<RideStatus>("waitForTrain")

  useEffect(() => {
    const train = getTrainFromStationId(route, nextStationId)

    if (route.trains[0].originStationId != train.originStationId) {
      // not the first train, possibly an exchange
      if (train.originStationId == nextStationId) {
        setStatus("inExchange")
      }
    } else if (train.originStationId != nextStationId) {
      setStatus("inTransit")
    } else if (Date.now() >= route.trains[route.trains.length - 1].arrivalTime + delay * 60000) {
      setStatus("arrived")
    }
  }, [route, nextStationId, delay])

  return status
}
