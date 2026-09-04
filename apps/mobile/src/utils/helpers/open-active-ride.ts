import { router } from "expo-router"
import { useRideStore } from "@/models/ride/ride"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"

/**
 * Opens the active ride screen for the ride currently in progress, if there is one.
 */
export const openActiveRide = () => {
  const rideState = useRideStore.getState()
  const { route } = rideState
  const originId = rideState.originId()
  const destinationId = rideState.destinationId()
  if (!route) return

  useNavigationParamsStore.getState().setRouteDetails({
    routeItem: route,
    originId: String(originId),
    destinationId: String(destinationId),
  })
  // `navigate` (not `push`) so that if the active-ride modal is already open
  // it stays intact instead of stacking a duplicate, and if it was dismissed —
  // or another screen is showing — it reliably reopens.
  router.navigate("/active-ride")
}
