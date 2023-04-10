import dayjs from "dayjs"
import { flatMap, flatten, last, compact } from "lodash"

import { Ride } from "../types/rides"
import { RouteItem } from "../types/rail"
import { translate } from "../locales/i18n"
import { isLastTrain, exchangeTrainPrompt } from "./ride-utils"
import { BuildNotificationPayload, Status } from "../types/notifications"

export const rideUpdateSecond = (token: string) => {
  let hashValue = 0

  for (let i = 0; i < token.length; i++) {
    hashValue += token.charCodeAt(i)
  }

  return hashValue % 60
}

export const buildGetOnTrainNotifications = (route: RouteItem, ride: Ride): BuildNotificationPayload[] => {
  return route.trains.map((train) => ({
    token: ride.token,
    time: dayjs(train.departureTime).subtract(1, "minute"),
    state: {
      delay: train.delay,
      status: Status.getOn,
      nextStationId: train.originStationId,
    },
    alert: {
      title: translate("notifications.getOn.title", ride.locale),
      text: translate("notifications.getOn.description", ride.locale, {
        lastStop: train.lastStop,
        platform: train.originPlatform,
      }),
    },
  }))
}

export const buildNextStationNotifications = (route: RouteItem, ride: Ride): BuildNotificationPayload[] => {
  return flatMap(route.trains, (train) => {
    const lastStationNotificationTime = dayjs(last(train.stopStations)?.departureTime || train.departureTime).add(1, "minutes")
    const shouldSendLastStationNotification = lastStationNotificationTime.isBefore(
      dayjs(train.arrivalTime).subtract(2, "minutes"),
    )

    const lastStation = shouldSendLastStationNotification && {
      token: ride.token,
      time: lastStationNotificationTime,
      state: {
        delay: train.delay,
        status: Status.inTransit,
        nextStationId: train.destinationStationId,
      },
    }

    const passthroughStations = train.stopStations.map((station, index) => ({
      token: ride.token,
      time: dayjs(index === 0 ? train.departureTime : train.stopStations[index - 1].departureTime).add(1, "minute"),
      state: {
        delay: train.delay,
        status: Status.inTransit,
        nextStationId: station.stationId,
      },
    }))

    return compact([...passthroughStations, lastStation])
  })
}

export const buildGetOffTrainNotifications = (route: RouteItem, ride: Ride) => {
  return flatten(
    route.trains.map((train, index) => {
      return [
        {
          token: ride.token,
          time: dayjs(train.arrivalTime).subtract(2, "minutes"),
          state: {
            delay: train.delay,
            status: Status.inTransit,
            nextStationId: train.destinationStationId,
          },
          alert: {
            title: translate("notifications.prepareToGetOff.title", ride.locale),
            text: translate("notifications.prepareToGetOff.description", ride.locale, {
              station: train.destinationStationName,
            }),
          },
        },
        {
          token: ride.token,
          time: dayjs(train.arrivalTime).subtract(1, "minutes"),
          state: {
            delay: train.delay,
            status: Status.getOff,
            nextStationId: train.destinationStationId,
          },
          alert: {
            title: translate("notifications.getOff.title", ride.locale),
            text: isLastTrain(route.trains, train)
              ? translate("notifications.getOff.description", ride.locale, {
                  station: train.destinationStationName,
                })
              : exchangeTrainPrompt(route.trains, index, ride.locale),
          },
        },
        {
          token: ride.token,
          time: dayjs(train.arrivalTime),
          state: {
            nextStationId: train.destinationStationId,
            status: isLastTrain(route.trains, train) ? Status.arrived : Status.waitForTrain,
            delay: isLastTrain(route.trains, train) ? train.delay : route.trains[index + 1].delay,
          },
        },
      ]
    }),
  )
}