import dayjs from "dayjs"
import { flatMap, flatten, keys, last } from "lodash"
import { cancelJob, scheduleJob, scheduledJobs } from "node-schedule"

import { Ride } from "../types/rides"
import { sendNotification } from "./notify"
import { translate } from "../locales/i18n"
import { getRouteForRide } from "../requests"
import { NotificationPayload } from "../types/notifications"
import { deleteRide, updateLastRideNotification } from "../data/redis"
import { exchangeTrainPrompt, generateJobId, isLastTrain } from "../utils/ride-utils"

export const startRideNotifications = async (ride: Ride) => {
  try {
    const route = await getRouteForRide(ride)
    if (!route) {
      throw new Error("couldn't get route for this ride")
    }

    if (Date.now() >= route.arrivalTime) {
      deleteRide(ride.token)
      return false
    }

    const getOnTrain: NotificationPayload[] = route.trains.map((train) => ({
      time: dayjs(train.departureTime).subtract(1, "minute"),
      state: {
        delay: train.delay,
        arrived: false,
        inExchange: false,
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

    const passThroughStations: NotificationPayload[] = flatMap(route.trains, (train) => {
      return train.stopStations.map((station, index) => ({
        time: dayjs(index === 0 ? train.departureTime : train.stopStations[index - 1].departureTime).add(1, "minute"),
        state: {
          nextStationId: station.stationId,
          delay: train.delay,
          inExchange: false,
          arrived: false,
        },
      }))
    })

    const getOffTrain: NotificationPayload[] = flatten(
      route.trains.map((train, index) => {
        return [
          {
            time: dayjs(last(train.stopStations)?.departureTime || train.departureTime).add(1, "minutes"),
            state: {
              nextStationId: train.destinationStationId,
              delay: train.delay,
              inExchange: false,
              arrived: false,
            },
          },
          {
            time: dayjs(train.arrivalTime).subtract(3, "minutes"),
            state: {
              nextStationId: train.destinationStationId,
              delay: train.delay,
              inExchange: false,
              arrived: false,
            },
            alert: {
              title: translate("notifications.prepareToGetOff.title", ride.locale),
              text: translate("notifications.prepareToGetOff.description", ride.locale, {
                station: train.destinationStationName,
              }),
            },
          },
          {
            time: dayjs(train.arrivalTime).subtract(1, "minutes"),
            state: {
              nextStationId: train.destinationStationId,
              delay: train.delay,
              inExchange: false,
              arrived: false,
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
            time: dayjs(train.arrivalTime),
            state: {
              nextStationId: train.destinationStationId,
              delay: isLastTrain(route.trains, train) ? train.delay : route.trains[index + 1].delay,
              inExchange: !isLastTrain(route.trains, train),
              arrived: isLastTrain(route.trains, train),
            },
          },
        ]
      }),
    )

    const notifications = [...getOnTrain, ...passThroughStations, ...getOffTrain]
      .sort((a, b) => (a.time.isAfter(b.time) ? 1 : -1))
      .map((notification, index) => ({
        ...notification,
        id: index + 1,
      }))
      .filter((notification) => notification.id > ride.lastNotificationId)

    notifications.forEach((notification) => {
      scheduleJob(generateJobId(ride), notification.time.toDate(), () => {
        sendNotification(notification)

        if (last(notifications)?.id === notification.id) {
          deleteRide(ride.token)
        } else {
          updateLastRideNotification(ride.token, notification.id)
        }
      })
    })

    return true
  } catch {
    return false
  }
}

export const endRideNotifications = (token: string) => {
  return keys(scheduledJobs)
    .filter((job) => job.startsWith(token))
    .map((job) => cancelJob(job))
    .every((value) => value)
}
