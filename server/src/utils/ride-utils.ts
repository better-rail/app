import { v4 as uuid } from "uuid"
import { isEqual, last } from "lodash"

import { Ride } from "../types/rides"
import { localizedDifference } from "./date-utils"
import { RouteItem, RouteTrain } from "../types/rail"
import { LanguageCode, translate } from "../locales/i18n"

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
