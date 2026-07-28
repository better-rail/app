import { getRideStatus, getTrainFromStationId } from "@/utils/helpers/ride-helpers"

export function useRideStatus({ route, delay, nextStationId }) {
  // getRideStatus returns "loading" when the station can't be matched to a train
  return getRideStatus(route, getTrainFromStationId(route, nextStationId), nextStationId, delay)
}
