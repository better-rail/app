import dayjs from "dayjs"
import { v4 as uuid } from "uuid"
import { isEqual, last, isNumber, head, chunk } from "lodash"

import { logNames, logger } from "../logs"
import { getAllRides } from "../data/redis"
import { Ride, RideRequest } from "../types/ride"
import { startRideNotifications } from "../rides"
import { localizedDifference } from "./date-utils"
import { RouteItem, RouteTrain } from "../types/rail"
import { LanguageCode, translate } from "../locales/i18n"
import { NotificationPayload } from "../types/notification"
import { buildGetOnTrainNotifications, buildNextStationNotifications, buildGetOffTrainNotifications } from "./notify-utils"

export const buildRide = (ride: RideRequest): Ride => {
  const rideId = uuid()

  return {
    ...ride,
    rideId,
    lastNotificationId: 0,
  }
}

export const getSelectedRide = (routes: RouteItem[], ride: Ride) => {
  return routes.find((route) =>
    isEqual(
      route.trains.map((train) => train.trainNumber),
      ride.trains,
    ),
  )
}

export const isFirstTrain = (trains: RouteTrain[], train: RouteTrain) => {
  return head(trains)?.trainNumber === train.trainNumber
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

  return platformText + " " + waitTimeText
}

export const scheduleExistingRides = async () => {
  const rides = await getAllRides()
  if (!rides) return

  let results: boolean[] = []
  const chunkedRides = chunk(rides, 20)
  for (const chunk of chunkedRides) {
    const promises = chunk.map((ride) => {
      return startRideNotifications(ride, true).then((result) => result.success)
    })

    const responses = await Promise.all(promises)
    results.push(...responses)
  }

  const successful = results.filter((val) => val)
  const failed = results.filter((val) => !val)
  logger.info(logNames.scheduler.scheduleExisting, {
    count: rides.length,
    successful: successful.length,
    failed: failed.length,
  })
}

/**
  @param filterPastNotifications If false, all notifications will be returned
  @param lastNotificationId If true, notifications with a greater id will be returned. Otherwise past notifications will be calculated by time + current delay
  @returns Filtered notification to send for ride
  */
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

export const getUpdatedLastNotification = (route: RouteItem, ride: Ride, lastNotificationId: number) => {
  const notifications = buildNotifications(route, ride, false)
  return notifications.find((current) => current.id === lastNotificationId)
}
