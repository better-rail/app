import dayjs from "dayjs"
import { v4 as uuid } from "uuid"
import { isEqual, last, isNumber } from "lodash"

import { Ride } from "../types/rides"
import { logNames, logger } from "../logs"
import { getAllRides } from "../data/redis"
import { startRideNotifications } from "../rides"
import { localizedDifference } from "./date-utils"
import { RouteItem, RouteTrain } from "../types/rail"
import { LanguageCode, translate } from "../locales/i18n"
import { NotificationPayload } from "../types/notifications"
import { buildGetOnTrainNotifications, buildNextStationNotifications, buildGetOffTrainNotifications } from "./notify-utils"

export const getSelectedRide = (routes: RouteItem[], ride: Ride) => {
  return routes.find((route) =>
    isEqual(
      route.trains.map((train) => train.trainNumber),
      ride.trains,
    ),
  )
}

export const generateJobId = (ride: Ride) => {
  return ride.token + "-" + uuid()
}

export const isLastTrain = (trains: RouteTrain[], train: RouteTrain) => {
  return last(trains)?.trainNumber === train.trainNumber
}

export const exchangeTrainPrompt = (trains: RouteTrain[], gotOffTrain: number, locale: LanguageCode) => {
  const previous = trains[gotOffTrain]
  const next = trains[gotOffTrain + 1]

  const waitTime = localizedDifference(next.departureTime, previous.arrivalTime, locale)
  const waitTimeText = translate("notifications.exchange.waitTime", locale, { waitTime })

  const platformKey = previous.destinationPlatform === next.originPlatform ? "stayInPlatform" : "changePlatform"
  const platformText = translate(platformKey, locale, {
    scope: "notifications.exchange",
    platform: next.originPlatform,
  })

  return platformText + " | " + waitTimeText
}

export const scheduleExistingRides = async () => {
  const rides = await getAllRides()
  const promises = rides.map((ride) => {
    return startRideNotifications(ride)
  })
  const schedules = await Promise.all(promises)
  const successful = schedules.filter((val) => val)
  const failed = schedules.filter((val) => !val)
  logger.info(logNames.scheduler.scheduleExisting, {
    count: promises.length,
    successful: successful.length,
    failed: failed.length,
  })
}

export const buildNotifications = (
  route: RouteItem,
  ride: Ride,
  filterPastNotifications: boolean,
  lastNotificationId?: number,
): NotificationPayload[] => {
  const builtNotifications = [
    ...buildGetOnTrainNotifications(route, ride),
    ...buildNextStationNotifications(route, ride),
    ...buildGetOffTrainNotifications(route, ride),
  ]

  return builtNotifications
    .sort((a, b) => (a.time.isAfter(b.time) ? 1 : -1))
    .map((notification, index) => ({
      ...notification,
      id: index + 1,
    }))
    .filter((notification) => {
      if (!filterPastNotifications) {
        return true
      } else if (isNumber(lastNotificationId)) {
        return notification.id > lastNotificationId
      } else {
        const notificationTime = notification.time.add(notification.state.delay, "minutes")
        return notificationTime.isAfter(dayjs())
      }
    })
}
