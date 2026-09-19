import { router } from "expo-router"
import { format } from "date-fns"
import HapticFeedback from "react-native-haptic-feedback"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import type { RouteItem } from "@/services/api"
import { trackEvent } from "@/services/analytics"

/** Opens the Delay Guard sheet for the train the rider boards first on the route. */
export const openDelayGuardSheet = (routeItem: RouteItem, source: string) => {
  const train = routeItem.trains[0]
  if (!train) return
  HapticFeedback.trigger("impactLight")
  trackEvent("delay_guard_sheet_opened", { source, trainNumber: train.trainNumber })
  useNavigationParamsStore.getState().setDelayGuardDraft({
    trainNumber: train.trainNumber,
    originStationId: String(train.originStationId),
    destinationStationId: String(train.destinationStationId),
    departureTime: format(train.departureTime, "HH:mm"),
  })
  router.push("/delay-guard")
}
