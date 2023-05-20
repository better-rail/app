import { RouteItem } from "../../services/api"
import { useQueryClient } from "react-query"
import { useEffect, useMemo, useState } from "react"
import { formatDateForAPI } from "../../utils/helpers/date-helpers"
import { RouteApi } from "../../services/api/route-api"
import { findClosestStationInRoute, getSelectedRide } from "../../utils/helpers/ride-helpers"
import { useStores } from "../../models"

const api = new RouteApi()

/**
 * This function is used to find the next station in the route
 */
export function useRideRoute(route: RouteItem) {
  const { routePlan, ride } = useStores()

  // we'll need this to update the query cached routes when we refetch routes
  const queryClient = useQueryClient()

  const [nextStationId, setNextStationId] = useState<number>(route.trains[0].originStationId)
  const [delay, setDelay] = useState<number>(0)

  const { originId, destinationId, date, time } = useMemo(() => getRouteDetails(route), [route])

  const refetchRoute = async () => {
    // fetch route - needed for getting delay information
    const routes = await api.getRoutes(originId, destinationId, date, time)

    // update the query cached routes
    queryClient.setQueryData(
      ["origin", originId, "destination", destinationId, "time", new Date(routePlan.date.getDate())],
      routes,
    )

    const updatedRoute = getSelectedRide(
      routes,
      route.trains.map((t) => t.trainNumber),
    )

    return updatedRoute
  }

  const updateRide = async () => {
    const updatedRoute = await refetchRoute()

    if (ride.isRouteActive(route)) {
      // update the ride store route if the route item has an active ride
      ride.setRoute(updatedRoute)
    }

    setDelay(updatedRoute.delay)

    const stationId = findClosestStationInRoute(updatedRoute)
    setNextStationId(stationId)
  }

  useEffect(() => {
    // set up timer to run every minute
    const timer = setInterval(() => {
      updateRide()
    }, 60 * 1000)

    // set the route details immidiately on mount
    const stationId = findClosestStationInRoute(route)
    setNextStationId(stationId)
    setDelay(route.delay)

    // then check if there's a delay
    updateRide()

    // clear the timer when the component unmounts
    return () => clearInterval(timer)
  }, [])

  return [delay, nextStationId]
}

/**
 * This function is used to extract ride details from the route needed for API calls
 */
function getRouteDetails(route: RouteItem) {
  const originId = route.trains[0].originStationId.toString()
  const destinationId = route.trains[route.trains.length - 1].destinationStationId.toString()
  const [date, time] = formatDateForAPI(route.departureTime)

  return { originId, destinationId, date, time }
}
