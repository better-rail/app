import dayjs from "dayjs"
import { flatMap, flatten, last, compact, chain } from "lodash"

import { Ride } from "../types/ride"
import { RouteItem } from "../types/rail"
import { translate } from "../locales/i18n"
import { isLastTrain, exchangeTrainPrompt, isFirstTrain } from "./ride-utils"
import { BuildNotificationPayload, NotificationPayload, Status } from "../types/notification"

export const rideUpdateSecond = (rideId: string) => {
  let hashValue = 0

  for (let i = 0; i < rideId.length; i++) {
    hashValue += rideId.charCodeAt(i)
  }

  return hashValue % 60
}

export const getNotificationToSend = (notifications: NotificationPayload[], date: Date) => {
  return chain(notifications)
    .filter((notification) => {
      const notificationTime = notification.time.add(notification.state.delay, "minutes")
      return notificationTime.isSameOrBefore(date)
    })
    .sort((a, b) => (a.time.isAfter(b.time) ? 1 : -1))
    .last()
    .value()
}

export const buildWaitForTrainNotiifcation = (route: RouteItem, ride: Ride): NotificationPayload => {
  const train = route.trains[0]

  return {
    id: 0,
    token: ride.token,
    provider: ride.provider,
    shouldSendImmediately: false,
    time: dayjs(train.departureTime).subtract(2, "minute"),
    state: {
      delay: train.delay,
      status: Status.waitForTrain,
      nextStationId: train.originStationId,
    },
  }
}

export const buildGetOnTrainNotifications = (route: RouteItem, ride: Ride): BuildNotificationPayload[] => {
  return route.trains.map((train) => ({
    token: ride.token,
    provider: ride.provider,
    shouldSendImmediately: true,
    time: dayjs(train.departureTime).subtract(1, "minute"),
    state: {
      delay: train.delay,
      status: isFirstTrain(route.trains, train) ? Status.waitForTrain : Status.inExchange,
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
      dayjs(train.arrivalTime).subtract(3, "minutes"),
    )

    const lastStation = shouldSendLastStationNotification && {
      token: ride.token,
      provider: ride.provider,
      shouldSendImmediately: true,
      time: lastStationNotificationTime,
      state: {
        delay: train.delay,
        status: Status.inTransit,
        nextStationId: train.destinationStationId,
      },
    }

    const passthroughStations = train.stopStations.map((station, index) => ({
      token: ride.token,
      provider: ride.provider,
      shouldSendImmediately: true,
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

export const buildGetOffTrainNotifications = (route: RouteItem, ride: Ride): BuildNotificationPayload[] => {
  return flatten(
    route.trains.map((train, index) => {
      return [
        {
          token: ride.token,
          provider: ride.provider,
          shouldSendImmediately: false,
          time: dayjs(train.arrivalTime).subtract(3, "minutes"),
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
          provider: ride.provider,
          shouldSendImmediately: true,
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
          provider: ride.provider,
          shouldSendImmediately: true,
          time: dayjs(train.arrivalTime),
          state: {
            nextStationId: train.destinationStationId,
            status: isLastTrain(route.trains, train) ? Status.arrived : Status.inExchange,
            delay: isLastTrain(route.trains, train) ? train.delay : route.trains[index + 1].delay,
          },
        },
      ]
    }),
  )
}
