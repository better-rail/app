import { useEffect, useMemo, useState } from "react"
import { differenceInMinutes } from "date-fns"
import { findClosestStationInRoute, getSelectedRide, getTrainFromStationId } from "../utils/helpers/ride-helpers"
import { RouteItem } from "../services/api"
import { RouteApi } from "../services/api/route-api"
import { formatDateForAPI } from "../utils/helpers/date-helpers"
import { useQueryClient } from "react-query"

type RideStatus = "waitForTrain" | "inTransit" | "inExchange" | "arrived"

export function useRideProgress(route: RouteItem) {
  // initial state
  const [minutesLeft, setMinutesLeft] = useState<number>(0)
  const [delay, nextStationId] = useRideRoute(route)
  const status = useRideStatus({ route, delay, nextStationId })

  // update minutes left
  useEffect(() => {
    let minutes = 0
    const train = getTrainFromStationId(route, nextStationId)

    if (status == "inTransit") {
      minutes = differenceInMinutes(train.arrivalTime, Date.now()) + delay
    } else if (status == "waitForTrain" || status == "inExchange") {
      minutes = differenceInMinutes(train.departureTime, Date.now()) + delay
    }

    setMinutesLeft(minutes)
  }, [status, delay, nextStationId])

  return [status, minutesLeft] as const
}

function useRideStatus({ route, delay, nextStationId }) {
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
    } else if (Date.now() > route.trains[route.trains.length - 1].arrivalTime + delay * 60000) {
      setStatus("arrived")
    }
  }, [route, nextStationId, delay])

  return status
}

function useRideRoute(route: RouteItem) {
  const queryClient = useQueryClient()

  const [nextStationId, setNextStationId] = useState<number>(route.trains[0].originStationId)
  const [delay, setDelay] = useState<number>(0)

  // extract ride details from the route
  const [originId, destinationId, date, time] = useMemo(() => {
    const originId = route.trains[0].originStationId.toString()
    const destinationId = route.trains[route.trains.length - 1].destinationStationId.toString()
    const [date, time] = formatDateForAPI(route.departureTime)

    return [originId, destinationId, date, time]
  }, [route])

  const refetchRoute = async () => {
    // fetch route - needed for getting delay information
    const routes = await new RouteApi().getRoutes(originId, destinationId, date, time)

    const updatedRoute = getSelectedRide(
      routes,
      route.trains.map((t) => t.trainNumber),
    )

    // update the query cached routes
    queryClient.setQueryData(
      ["origin", originId, "destination", destinationId, "time", new Date(updatedRoute.departureTime).getDate()],
      routes,
    )

    setDelay(updatedRoute.delay)
  }

  const updateRide = () => {
    console.log("updating ride")
    refetchRoute()

    const stationId = findClosestStationInRoute(route)
    setNextStationId(stationId)
  }

  useEffect(() => {
    // set up timer
    const timer = setInterval(() => {
      updateRide()
    }, 60000)

    // initial refetch
    updateRide()

    const stationId = findClosestStationInRoute(route)
    setNextStationId(stationId)

    // clear the timer when the component unmounts
    return () => clearInterval(timer)
  }, [])

  return [delay, nextStationId]
}
