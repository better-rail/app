import { Alert, Linking } from "react-native"
import * as Clipboard from 'expo-clipboard'
import Share from "react-native-share"
import * as Calendar from "expo-calendar"
import { format } from "date-fns"
import { RouteItem } from "../../services/api"
import { translate, isRTL } from "../../i18n"
import { stationsObject, stationLocale } from "../../data/stations"
import { analytics } from "../../services/firebase/analytics"

export function formatRouteForSharing(
  routeItem: RouteItem,
  originId: string,
  destinationId: string,
): string {
  const data = buildRouteData(routeItem, originId, destinationId)
  return formatRouteMessage(data)
}

function buildRouteData(routeItem: RouteItem, originId: string, destinationId: string) {
  const originName = stationsObject[originId]?.[stationLocale] || "Unknown Station"
  const destinationName = stationsObject[destinationId]?.[stationLocale] || "Unknown Station"

  const departureTime = format(new Date(routeItem.departureTime), "HH:mm")
  const arrivalTime = format(new Date(routeItem.arrivalTime), "HH:mm")
  const departureDate = format(new Date(routeItem.departureTime), "dd/MM/yyyy")

  const exchangeInfo = routeItem.isExchange
    ? {
      stops: routeItem.trains.length - 1,
      text: routeItem.trains.length - 1 === 1
        ? translate("routes.oneChange")
        : `${routeItem.trains.length - 1} ${translate("routes.changes")}`
    }
    : { text: translate("routes.noChange") }

  const trainDetails = routeItem.trains.map((train, index) => ({
    index: index + 1,
    trainNumber: train.trainNumber,
    departureTime: format(new Date(train.departureTime), "HH:mm"),
    arrivalTime: format(new Date(train.arrivalTime), "HH:mm"),
  }))

  return {
    route: { originName, destinationName },
    schedule: { departureDate, departureTime, arrivalTime, duration: routeItem.duration },
    exchange: exchangeInfo,
    delay: routeItem.delay > 0 ? { minutes: routeItem.delay, text: translate("routes.delayTime") } : null,
    trains: trainDetails,
  }
}

const messageTemplates = {
  header: (originName: string, destinationName: string) => {
    const arrow = isRTL ? "←" : "→"
    return `🚆 ${originName} ${arrow} ${destinationName}`
  },

  date: (date: string) => `📅 ${date}`,

  time: (departure: string, arrival: string) => `⏰ ${departure} - ${arrival}`,

  duration: (duration: string) => `⏱️ ${duration}`,

  exchange: (text: string) => `🔄 ${text}`,

  delay: (minutes: number, text: string) => `⚠️ ${minutes} ${text}`,

  trainDetail: (index: number, trainNumber: number, departure: string, arrival: string) =>
    `${index}. ${translate("routeDetails.trainNo")} ${trainNumber}: ${departure} - ${arrival}`,

  footer: () => "📱 Better Rail"
}

function formatRouteMessage(data: ReturnType<typeof buildRouteData>): string {
  const sections = [
    // Header with route
    messageTemplates.header(data.route.originName, data.route.destinationName),

    // Date and time
    messageTemplates.date(data.schedule.departureDate),
    messageTemplates.time(data.schedule.departureTime, data.schedule.arrivalTime),
    messageTemplates.duration(data.schedule.duration),

    // Exchange information
    messageTemplates.exchange(data.exchange.text),

    // Delay (if any)
    ...(data.delay ? [messageTemplates.delay(data.delay.minutes, data.delay.text)] : []),

    // Separator
    "",

    // Individual trains
    ...data.trains.map(train =>
      messageTemplates.trainDetail(train.index, train.trainNumber, train.departureTime, train.arrivalTime)
    ),

    // Footer
    "",
    messageTemplates.footer()
  ]

  return sections.join("\n")
}

export async function copyRouteToClipboard(
  routeItem: RouteItem,
  originId: string,
  destinationId: string,
): Promise<void> {
  const routeText = formatRouteForSharing(routeItem, originId, destinationId)

  await Clipboard.setStringAsync(routeText)
}

export async function shareRoute(
  routeItem: RouteItem,
  originId: string,
  destinationId: string,
): Promise<void> {
  const routeText = formatRouteForSharing(routeItem, originId, destinationId)

  const shareOptions = {
    title: translate("routes.routeDetails"),
    message: routeText,
  }

  await Share.open(shareOptions)
}

function createEventConfig(routeItem: RouteItem) {
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

export async function addRouteToCalendar(routeItem: RouteItem): Promise<void> {
  analytics.logEvent("add_route_to_calendar")

  const { status } = await Calendar.requestCalendarPermissionsAsync()

  if (status !== "granted") {
    Alert.alert(translate("routeDetails.noCalendarAccessTitle"), translate("routeDetails.noCalendarAccessMessage"), [
      { style: "cancel", text: translate("common.cancel") },
      { text: translate("settings.title"), onPress: () => Linking.openSettings() },
    ])
    return
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
  } catch (error) {
    console.error(error)
    if (error instanceof Error) {
      Alert.alert("Event Error", error.message)
    }
    throw error
  }
}
