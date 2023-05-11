import { useEffect, useState } from "react"
import { differenceInMinutes } from "date-fns"
import { getTrainFromStationId } from "../../utils/helpers/ride-helpers"
import { RouteItem } from "../../services/api"
import { useRideStatus } from "./use-ride-status"
import { useRideRoute } from "./use-ride-route"
import { RouteLineStateType } from "../../screens"

export type RideStatus = "waitForTrain" | "inTransit" | "inExchange" | "arrived"

export function useRideProgress({ route, enabled }: { route: RouteItem; enabled: boolean }) {
  const [minutesLeft, setMinutesLeft] = useState<number>(0)
  const [delay, nextStationId] = useRideRoute(route)
  const status = useRideStatus({ route, delay, nextStationId })
  const stations = getStopStationStatus({ route, nextStationId, status, enabled })

  // update minutes left
  const calculateMinutesLeft = () => {
    let minutes = 0
    const train = getTrainFromStationId(route, nextStationId)

    if (status == "inTransit") {
      minutes = differenceInMinutes(train.arrivalTime, Date.now(), { roundingMethod: "ceil" }) + delay
    } else if (status == "waitForTrain" || status == "inExchange") {
      minutes = differenceInMinutes(train.departureTime, Date.now(), { roundingMethod: "ceil" }) + delay
    }

    setMinutesLeft(minutes)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      calculateMinutesLeft()
    }, 1000 * 60)

    calculateMinutesLeft()

    return () => clearInterval(timer)
  }, [status, delay, nextStationId])

  return { status, minutesLeft, stations, nextStationId }
}

interface GetStopStationStatusParams {
  route: RouteItem
  nextStationId: number
  status: RideStatus
  enabled: boolean
}

interface StopStationStatusItem {
  top: RouteLineStateType
  bottom: RouteLineStateType
  stationId?: number
}

export type StopStationStatusObject = Record<number, { top: RouteLineStateType; bottom: RouteLineStateType }>

function getStopStationStatus({ route, nextStationId, status, enabled }: GetStopStationStatusParams) {
  if (!enabled) return {}

  // flatten the stop stations from all trains
  const array = route.trains.map((train) => train.stopStations).flat()

  // build the stop stations status array
  const stopStationsStatusArray: StopStationStatusItem[] = array.map((stopStation) => ({
    top: "idle",
    bottom: "idle",
    stationId: stopStation.stationId,
  }))

  // convert the array to an object, so we could use the station id as a key
  const stopStationsObject = convertStopStationsStatusArrayToObject(stopStationsStatusArray)

  // get the train that the next station is in
  const train = getTrainFromStationId(route, nextStationId)

  // get the index of the train in the route
  const trainIndex = route.trains.indexOf(train)

  // if the train is not the first train in the route, we need to add the stations of the previous trains to the array
  if (trainIndex > 0) {
    // we need to add the stations of the previous trains to the array
    for (let i = 0; i < trainIndex; i++) {
      route.trains[i].stopStations.forEach((s) => {
        stopStationsObject[s.stationId] = { top: "passed", bottom: "passed" }
      })
    }
  }
  // moving on to add statuses for the stations in the current train
  // if origin station is not the next station, it means the train has departed already, so we need to inspect the stop stations
  if (train.originStationId !== nextStationId) {
    const nextStationIndex = train.stopStations.findIndex((stopStation) => stopStation.stationId === nextStationId)

    // the next station is not the first one, so we need to set the stop lines as follows:
    if (nextStationIndex >= 0) {
      stopStationsObject[nextStationId] = { top: "inProgress", bottom: "idle" }
    }

    let lastVisitedStationIndex = nextStationIndex - 1

    // make sure the last visited station is not the origin station
    if (lastVisitedStationIndex >= 0) {
      const lastVisitedStationId = train.stopStations[lastVisitedStationIndex].stationId
      stopStationsObject[lastVisitedStationId] = { top: "passed", bottom: "inProgress" }
    }

    // if the next station index is -1, it means the next station is the destination station -since it's not included in the stop stations array.
    // so we need to set the last visited station to the last station in the stop stations array
    if (nextStationIndex < 0) {
      lastVisitedStationIndex = train.stopStations.length
    }

    // set the rest of the stations as passed
    for (let i = 0; i < lastVisitedStationIndex; i++) {
      const stationId = train.stopStations[i].stationId
      stopStationsObject[stationId] = { top: "passed", bottom: "passed" }
    }
  }
  // handle the destination station status
  const destinationStationId = train.destinationStationId

  // update the last stop station status if we're en route to the destination station
  if (destinationStationId === nextStationId && status !== "arrived") {
    const lastStationId = train.stopStations[train.stopStations.length - 1].stationId
    stopStationsObject[lastStationId] = { top: "passed", bottom: "inProgress" }
  }

  if (destinationStationId === nextStationId && status === "arrived") {
    stopStationsObject[nextStationId] = { top: "passed", bottom: "passed" }
  } else if (destinationStationId === nextStationId && status !== "arrived") {
    stopStationsObject[nextStationId] = { top: "passed", bottom: "inProgress" }
  }

  return stopStationsObject
}

function convertStopStationsStatusArrayToObject(stopStationsStatusArray: StopStationStatus[]) {
  return stopStationsStatusArray.reduce((acc, stopStation) => {
    acc[stopStation.stationId] = stopStation
    return acc
  }, {} as Record<number, StopStationStatus>)
}
