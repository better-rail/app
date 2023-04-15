import dayjs from "dayjs"
import { keyBy } from "lodash"

import { minutesInMs } from "../helpers/utils"
import { Status } from "../../types/notifications"
import { exchangeRoute, stations, now, exchangeDuration, ride, getOffInExchangeTime } from "./mocks"
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

test("build get on notification for exchange train", () => {
  const getOnNotifications = buildGetOnTrainNotifications(exchangeRoute, ride)

  expect(getOnNotifications).toMatchObject([
    {
      token: ride.token,
      state: {
        delay: 2,
        nextStationId: 10,
        status: Status.waitForTrain,
      },
      shouldSendImmediately: true,
      time: dayjs(now - minutesInMs(1)),
      alert: {
        title: "Get on the train",
        text: "Take the train to Ashkelon from platform 6",
      },
    },
    {
      token: ride.token,
      state: {
        delay: 4,
        nextStationId: 30,
        status: Status.waitForTrain,
      },
      shouldSendImmediately: true,
      time: dayjs(now + minutesInMs(14)),
      alert: {
        title: "Get on the train",
        text: "Take the train to Jerusalem - Yitzhak Navon from platform 4",
      },
    },
  ])
})

test("build next station notifications for direct train", () => {
  const nextStationNotifications = buildNextStationNotifications(exchangeRoute, ride)

  expect(nextStationNotifications).toMatchObject([
    {
      token: ride.token,
      state: {
        delay: 2,
        nextStationId: 20,
        status: Status.inTransit,
      },
      shouldSendImmediately: true,
      time: dayjs(now + minutesInMs(1)),
    },
    {
      token: ride.token,
      state: {
        delay: 2,
        nextStationId: 30,
        status: Status.inTransit,
      },
      shouldSendImmediately: true,
      time: dayjs(now + minutesInMs(6)),
    },
    {
      token: ride.token,
      state: {
        delay: 4,
        nextStationId: 50,
        status: Status.inTransit,
      },
      shouldSendImmediately: true,
      time: dayjs(now + minutesInMs(16)),
    },
    {
      token: ride.token,
      state: {
        delay: 4,
        nextStationId: 60,
        status: Status.inTransit,
      },
      shouldSendImmediately: true,
      time: dayjs(now + minutesInMs(21)),
    },
  ])
})

test("build get off notifications for direct train", () => {
  const getOffNotifications = buildGetOffTrainNotifications(exchangeRoute, ride)

  expect(getOffNotifications).toMatchObject([
    {
      token: ride.token,
      state: {
        delay: 2,
        nextStationId: 30,
        status: Status.inTransit,
      },
      shouldSendImmediately: false,
      time: dayjs(now + getOffInExchangeTime - minutesInMs(2)),
      alert: {
        title: "Prepare to get off",
        text: "The train will arrive shortly at Tel Aviv - Savidor Center",
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
      time: dayjs(now + getOffInExchangeTime - minutesInMs(1)),
      alert: {
        title: "Get off now",
        text: "Move to platform 4 | Wait for 5 minutes",
      },
    },
    {
      token: ride.token,
      state: {
        delay: 4,
        nextStationId: 30,
        status: Status.inExchange,
      },
      shouldSendImmediately: true,
      time: dayjs(now + getOffInExchangeTime),
    },
    {
      token: ride.token,
      state: {
        delay: 4,
        nextStationId: 60,
        status: Status.inTransit,
      },
      shouldSendImmediately: false,
      time: dayjs(now + exchangeDuration - minutesInMs(2)),
      alert: {
        title: "Prepare to get off",
        text: "The train will arrive shortly at Jerusalem - Yitzhak Navon",
      },
    },
    {
      token: ride.token,
      state: {
        delay: 4,
        nextStationId: 60,
        status: Status.getOff,
      },
      shouldSendImmediately: true,
      time: dayjs(now + exchangeDuration - minutesInMs(1)),
      alert: {
        title: "Get off now",
        text: "The train arrived at Jerusalem - Yitzhak Navon",
      },
    },
    {
      token: ride.token,
      state: {
        delay: 4,
        nextStationId: 60,
        status: Status.arrived,
      },
      shouldSendImmediately: true,
      time: dayjs(now + exchangeDuration),
    },
  ])
})
