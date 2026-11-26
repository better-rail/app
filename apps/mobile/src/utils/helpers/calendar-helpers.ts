import { Alert, Linking, Platform } from "react-native"
// The legacy API's createEventInCalendarAsync presents the system sheet without requiring calendar permission
// (iOS 17+ and Android). The object-oriented API's addEventWithForm always requires it.
import * as Calendar from "expo-calendar/legacy"
import { translate } from "@/i18n"
import { trackEvent } from "@/services/analytics"
import type { RouteItem } from "@/services/api"

export interface CalendarEventConfig {
  title: string
  startDate: string
  endDate: string
  location: string
  notes: string
}

export function createEventConfig(routeItem: RouteItem): CalendarEventConfig {
  if (!routeItem?.trains?.length) {
    throw new Error("No trains found in routeItem")
  }

  const origin = routeItem.trains[0].originStationName
  const destination = routeItem.trains[routeItem.trains.length - 1].destinationStationName

  const title = translate("plan.rideTo", { destination })
  const notes = routeItem.trains
    .flatMap((train, index) => {
      const leg = [
        translate("plan.trainFromToStation", {
          trainNumber: train.trainNumber,
          origin: train.originStationName,
          destination: train.destinationStationName,
        }),
      ]

      // Platform 0 means the platform wasn't set yet
      if (train.originPlatform !== 0) {
        leg.push(`${translate("routeDetails.platform")} ${train.originPlatform}`)
      }

      return index === 0 ? leg : [`${translate("routeDetails.changeAt")}${train.originStationName}`, ...leg]
    })
    .join("\n")

  return {
    title,
    startDate: new Date(routeItem.departureTime).toISOString(),
    endDate: new Date(routeItem.arrivalTime).toISOString(),
    location: translate("plan.trainStation", { stationName: origin }),
    notes,
  }
}

// The system "New Event" sheet runs outside the app on iOS 17+ and Android, so it needs no calendar permission.
// iOS 16 still requires calendar access before presenting it.
function needsCalendarPermission(): boolean {
  return Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) < 17
}

export async function addRouteToCalendar(routeItem: RouteItem): Promise<boolean> {
  trackEvent("add_route_to_calendar")

  if (needsCalendarPermission()) {
    const { status } = await Calendar.requestCalendarPermissionsAsync()

    if (status !== "granted") {
      Alert.alert(translate("routeDetails.noCalendarAccessTitle"), translate("routeDetails.noCalendarAccessMessage"), [
        { style: "cancel", text: translate("common.cancel") },
        { text: translate("settings.title"), onPress: () => Linking.openSettings() },
      ])
      return false
    }
  }

  const eventConfig = createEventConfig(routeItem)

  try {
    // On Android the action is always "done": the system doesn't report whether the event was saved.
    const { action } = await Calendar.createEventInCalendarAsync({
      title: eventConfig.title,
      startDate: new Date(eventConfig.startDate),
      endDate: new Date(eventConfig.endDate),
      location: eventConfig.location,
      notes: eventConfig.notes,
    })
    return action !== "canceled"
  } catch (error) {
    console.error(error)
    if (error instanceof Error) {
      Alert.alert("Event Error", error.message)
    }
    return false
  }
}
