import { Alert, Linking } from "react-native"
import * as Calendar from "expo-calendar"
import { translate } from "../../i18n"
import { analytics } from "../../services/firebase/analytics"
import type { RouteItem } from "../../services/api"

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
  const trainNumber = routeItem.trains[0].trainNumber
  const destination = routeItem.trains[routeItem.trains.length - 1].destinationStationName

  const title = translate("plan.rideTo", { destination })
  const notes = translate("plan.trainFromToStation", { trainNumber, origin, destination })

  return {
    title,
    startDate: new Date(routeItem.departureTime).toISOString(),
    endDate: new Date(routeItem.arrivalTime).toISOString(),
    location: translate("plan.trainStation", { stationName: origin }),
    notes,
  }
}

export async function addRouteToCalendar(routeItem: RouteItem): Promise<boolean> {
  analytics.logEvent("add_route_to_calendar")

  const { status } = await Calendar.requestCalendarPermissionsAsync()

  if (status !== "granted") {
    Alert.alert(translate("routeDetails.noCalendarAccessTitle"), translate("routeDetails.noCalendarAccessMessage"), [
      { style: "cancel", text: translate("common.cancel") },
      { text: translate("settings.title"), onPress: () => Linking.openSettings() },
    ])
    return false
  }

  const eventConfig = createEventConfig(routeItem)

  try {
    await Calendar.createEventInCalendarAsync({
      title: eventConfig.title,
      startDate: new Date(eventConfig.startDate),
      endDate: new Date(eventConfig.endDate),
      location: eventConfig.location,
      notes: eventConfig.notes,
    })
    return true
  } catch (error) {
    console.error(error)
    if (error instanceof Error) {
      Alert.alert("Event Error", error.message)
    }
    return false
  }
}