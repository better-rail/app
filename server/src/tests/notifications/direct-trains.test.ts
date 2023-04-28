import dayjs from "dayjs"
import { keyBy } from "lodash"

import { minutesInMs } from "../helpers/utils"
import { Status } from "../../types/notification"
import { directRoute, stations, now, directDuration, ride } from "./mocks"
import {
  buildGetOnTrainNotifications,
  buildNextStationNotifications,
  buildGetOffTrainNotifications,
} from "../../utils/notify-utils"

beforeAll(() => {
  jest.mock("../../data/stations", () => ({
    stations,
    stationsObject: keyBy(stations, "id"),
  }))
})

test("build get on notification for direct train", () => {
  const getOnNotifications = buildGetOnTrainNotifications(directRoute, ride)

  expect(getOnNotifications).toMatchObject([
    {
      token: ride.token,
      state: {
        delay: 2,
        nextStationId: 10,
        status: Status.waitForTrain,
      },
      provider: ride.provider,
      shouldSendImmediately: true,
      time: dayjs(now - minutesInMs(1)),
      alert: {
        title: "Hop on board!",
        text: "Take the train from platform 6 to Ashkelon.",
      },
    },
  ])
})

test("build next station notifications for direct train", () => {
  const nextStationNotifications = buildNextStationNotifications(directRoute, ride)

  expect(nextStationNotifications).toMatchObject([
    {
      token: ride.token,
      state: {
        delay: 2,
        nextStationId: 20,
        status: Status.inTransit,
      },
      time: dayjs(now + minutesInMs(1)),
      shouldSendImmediately: true,
      provider: ride.provider,
    },
    {
      token: ride.token,
      state: {
        delay: 2,
        nextStationId: 30,
        status: Status.inTransit,
      },
      time: dayjs(now + minutesInMs(6)),
      shouldSendImmediately: true,
      provider: ride.provider,
    },
  ])
})

test("build get off notifications for direct train", () => {
  const getOffNotifications = buildGetOffTrainNotifications(directRoute, ride)

  expect(getOffNotifications).toMatchObject([
    {
      token: ride.token,
      state: {
        delay: 2,
        nextStationId: 30,
        status: Status.inTransit,
      },
      shouldSendImmediately: false,
      provider: ride.provider,
      time: dayjs(now + directDuration - minutesInMs(3)),
      alert: {
        title: "Prepare to exit the train",
        text: "The train arriving soon at Tel Aviv - Savidor Center.",
      },
    },
    {
      token: ride.token,
      state: {
        delay: 2,
        nextStationId: 30,
        status: Status.getOff,
      },
      shouldSendImmediately: true,
      provider: ride.provider,
      time: dayjs(now + directDuration - minutesInMs(1)),
      alert: {
        title: "Time to get off!",
        text: "The train arrives at Tel Aviv - Savidor Center. Get ready to exit!",
      },
    },
    {
      token: ride.token,
      state: {
        delay: 2,
        nextStationId: 30,
        status: Status.arrived,
      },
      shouldSendImmediately: true,
      provider: ride.provider,
      time: dayjs(now + directDuration),
    },
  ])
})
