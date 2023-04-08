import dayjs from "dayjs"
import { flatMap, flatten, keys, last } from "lodash"
import { cancelJob, scheduleJob, scheduledJobs } from "node-schedule"

import { Ride } from "../types/rides"
import { logNames, logger } from "../logs"
import { sendNotification } from "./notify"
import { translate } from "../locales/i18n"
import { getRouteForRide } from "../requests"
import { deleteRide, updateLastRideNotification } from "../data/redis"
import { exchangeTrainPrompt, generateJobId, isLastTrain } from "../utils/ride-utils"
import { BuildNotificationPayload, NotificationPayload } from "../types/notifications"

export const startRideNotifications = async (ride: Ride) => {
  try {
    const route = await getRouteForRide(ride)
    if (!route) {
      return false
    }

    if (Date.now() >= route.arrivalTime) {
      logger.failed(logNames.scheduler.rideInPast, {
        date: ride.departureDate,
        origin: ride.originId,
        destination: ride.destinationId,
        trains: ride.trains,
      })
      deleteRide(ride.token)
      return false
    }

    const getOnTrain: BuildNotificationPayload[] = route.trains.map((train) => ({
      token: ride.token,
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

    const passThroughStations: BuildNotificationPayload[] = flatMap(route.trains, (train) => {
      return train.stopStations.map((station, index) => ({
        token: ride.token,
        time: dayjs(index === 0 ? train.departureTime : train.stopStations[index - 1].departureTime).add(1, "minute"),
        state: {
          nextStationId: station.stationId,
          delay: train.delay,
          inExchange: false,
          arrived: false,
        },
      }))
    })

    const getOffTrain: BuildNotificationPayload[] = flatten(
      route.trains.map((train, index) => {
        return [
          {
            token: ride.token,
            time: dayjs(last(train.stopStations)?.departureTime || train.departureTime).add(1, "minutes"),
            state: {
              nextStationId: train.destinationStationId,
              delay: train.delay,
              inExchange: false,
              arrived: false,
            },
          },
          {
            token: ride.token,
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
            token: ride.token,
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
            token: ride.token,
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

    const notifications: NotificationPayload[] = [...getOnTrain, ...passThroughStations, ...getOffTrain]
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

    logger.success(logNames.scheduler.registerRide.success, { token: ride.token })
    return true
  } catch (error) {
    logger.failed(logNames.scheduler.registerRide.failed, { error, token: ride.token })
    return false
  }
}

export const endRideNotifications = (token: string) => {
  try {
    const result = keys(scheduledJobs)
      .filter((job) => job.startsWith(token))
      .map((job) => cancelJob(job))
      .every((value) => value)

    if (!result) {
      throw new Error("Couldn't cancel all jobs")
    }

    logger.success(logNames.scheduler.cancelRide.success, { token })
    return result
  } catch (error) {
    logger.failed(logNames.scheduler.cancelRide.failed, { error, token })
    return false
  }
}
