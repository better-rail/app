import * as Clipboard from 'expo-clipboard'
import Share from "react-native-share"
import { format } from "date-fns"
import { RouteItem } from "../../services/api"
import { translate, isRTL } from "../../i18n"
import { stationsObject, stationLocale } from "../../data/stations"
import { addRouteToCalendar as addRouteToCalendarHelper } from "./calendar-helpers"

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

  departure: (time: string) => `${translate("routes.departsAt")} ${time}`,

  arrival: (time: string) => `${translate("routes.arrivesAt")} ${time}`,
}

function formatRouteMessage(data: ReturnType<typeof buildRouteData>): string {
  const sections = [
    // Header with route
    messageTemplates.header(data.route.originName, data.route.destinationName),

    // Empty line
    "",

    // Date
    messageTemplates.date(data.schedule.departureDate),
    
    // Departure and arrival times
    messageTemplates.departure(data.schedule.departureTime),
    messageTemplates.arrival(data.schedule.arrivalTime),
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

export async function addRouteToCalendar(routeItem: RouteItem): Promise<void> {
  await addRouteToCalendarHelper(routeItem)
}
