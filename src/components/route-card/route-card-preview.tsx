import React from "react"
import { ViewStyle } from "react-native"
import { RouteCard } from "./route-card"
import { RouteItem } from "@/services/api"
import { formatRouteDuration, routeDurationInMs } from "@/utils/helpers/date-helpers"

interface RouteCardPreviewProps {
  /** Forces the train info header on/off regardless of the `showRouteCardHeader` setting. */
  showHeaderOverride?: boolean
  style?: ViewStyle
}

/**
 * A display-only RouteCard used in settings/onboarding previews.
 *
 * The preview data is built at render time (not module load) so that the
 * duration string is formatted with the current locale. Building it as a
 * module-level constant would freeze it to whatever locale was active when the
 * module was first imported — often English, before the user's language is set.
 */
export function RouteCardPreview({ showHeaderOverride, style }: RouteCardPreviewProps) {
  const routeItem = ((): RouteItem => {
    const now = new Date().getTime()
    const arrivalTime = now + 1000 * 60 * 26

    return {
      delay: 0,
      isExchange: false,
      duration: formatRouteDuration(routeDurationInMs(now, arrivalTime)),
      departureTime: now,
      departureTimeString: new Date(now).toISOString(),
      arrivalTime,
      arrivalTimeString: new Date(now).toISOString(),
      isMuchLonger: false,
      isMuchShorter: false,
      trains: [
        {
          originStationId: 1,
          originStationName: "Tel Aviv",
          destinationStationId: 2,
          destinationStationName: "Jerusalem",
          arrivalTime,
          arrivalTimeString: new Date(now).toISOString(),
          departureTime: now,
          departureTimeString: new Date(now).toISOString(),
          originPlatform: 3,
          destinationPlatform: 2,
          trainNumber: 364,
          stopStations: [],
          lastStop: "",
          delay: 0,
          trainPosition: { calcDiffMinutes: 0 },
          routeStations: [],
          visaWagonData: null,
        },
      ],
    }
  })()

  return (
    <RouteCard
      isActiveRide={false}
      isRouteInThePast={false}
      departureTime={routeItem.departureTime}
      arrivalTime={routeItem.arrivalTime}
      duration={routeItem.duration}
      isMuchShorter={false}
      isMuchLonger={false}
      stops={0}
      delay={0}
      routeItem={routeItem}
      showHeaderOverride={showHeaderOverride}
      style={style}
    />
  )
}
