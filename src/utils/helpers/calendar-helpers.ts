import { Alert, Linking, Platform } from "react-native"
import * as Calendar from "expo-calendar"
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

// getDefaultCalendarSync is iOS-only, so on Android we pick the primary (or any modifiable) calendar
async function getEventCalendar(): Promise<Calendar.ExpoCalendar> {
  if (Platform.OS === "ios") {
    return Calendar.getDefaultCalendarSync()
  }

  const calendars = await Calendar.getCalendars()
  const eventCalendar =
    calendars.find((calendar) => calendar.isPrimary) ?? calendars.find((calendar) => calendar.allowsModifications)
  if (!eventCalendar) {
    throw new Error("No modifiable calendar found on device")
  }
  return eventCalendar
}

export async function addRouteToCalendar(routeItem: RouteItem): Promise<boolean> {
  trackEvent("add_route_to_calendar")

  const { status } = await Calendar.requestCalendarPermissions()

  if (status !== "granted") {
    Alert.alert(translate("routeDetails.noCalendarAccessTitle"), translate("routeDetails.noCalendarAccessMessage"), [
      { style: "cancel", text: translate("common.cancel") },
      { text: translate("settings.title"), onPress: () => Linking.openSettings() },
    ])
    return false
  }

  const eventConfig = createEventConfig(routeItem)

  try {
    const eventCalendar = await getEventCalendar()
    const { action } = await eventCalendar.addEventWithForm({
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
