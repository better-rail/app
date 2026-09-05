import { stationLocale, stationsObject } from "@/data/stations"
import { useFavoritesStore } from "@/models/favorites/favorites"
import { useRoutePlanStore } from "@/models/route-plan/route-plan"

const defaultOriginImage = require("../../../../../assets/station-images/tlv-center.jpg")

export function useWidgetPreviewRoute() {
  const planOrigin = useRoutePlanStore((s) => s.origin?.id)
  const planDestination = useRoutePlanStore((s) => s.destination?.id)
  const firstFavorite = useFavoritesStore((s) => s.routes[0])

  let originId = ""
  let destinationId = ""

  if (planOrigin && planDestination && planOrigin !== planDestination) {
    originId = planOrigin
    destinationId = planDestination
  } else if (firstFavorite?.originId && firstFavorite?.destinationId) {
    originId = firstFavorite.originId
    destinationId = firstFavorite.destinationId
  } else {
    originId = "3700" // Tel Aviv - Savidor Center
    destinationId = "680" // Jerusalem - Yitzhak Navon
  }

  const originStation = stationsObject[originId]
  const destinationStation = stationsObject[destinationId]

  const originName = originStation?.[stationLocale] ?? originStation?.hebrew ?? "Tel Aviv - Savidor Center"
  const destinationName = destinationStation?.[stationLocale] ?? destinationStation?.hebrew ?? "Jerusalem - Yitzhak Navon"
  const backgroundImage = originStation?.image ?? defaultOriginImage

  return {
    originId,
    destinationId,
    originName,
    destinationName,
    backgroundImage,
  }
}
