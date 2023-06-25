import dayjs from "dayjs"
import { keyBy } from "lodash"

import { minutesInMs } from "../helpers/utils"
import { Status } from "../../types/notification"
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
      provider: ride.provider,
      time: dayjs(now - minutesInMs(1)),
      alert: {
        title: "Hop on board!",
        text: "Take the train from Platform 6 to Ashkelon.",
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
      provider: ride.provider,
      time: dayjs(now + minutesInMs(14)),
      alert: {
        title: "Hop on board!",
        text: "Take the train from Platform 4 to Jerusalem - Yitzhak Navon.",
      },
    },
  ])
})

test("build next station notifications for exchange train", () => {
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
      provider: ride.provider,
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
      provider: ride.provider,
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
      provider: ride.provider,
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
      provider: ride.provider,
      time: dayjs(now + minutesInMs(21)),
    },
  ])
})

test("build get off notifications for exchange train", () => {
  const getOffNotifications = buildGetOffTrainNotifications(exchangeRoute, ride)

  expect(getOffNotifications).toMatchObject([
    {
      token: ride.token,
      state: {
        delay: 2,
        nextStationId: 30,
        status: Status.inTransit,
      },
      provider: ride.provider,
      shouldSendImmediately: false,
      time: dayjs(now + getOffInExchangeTime - minutesInMs(3)),
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
      provider: ride.provider,
      shouldSendImmediately: true,
      time: dayjs(now + getOffInExchangeTime - minutesInMs(1)),
      alert: {
        title: "Time to get off!",
        text: "Change to Platform 4. Wait 5 minutes for your next train.",
      },
    },
    {
      token: ride.token,
      state: {
        delay: 2,
        nextStationId: 30,
        status: Status.inExchange,
      },
      provider: ride.provider,
      shouldSendImmediately: true,
      time: dayjs(now + getOffInExchangeTime),
    },
    {
      token: ride.token,
      state: {
        delay: 4,
        nextStationId: 30,
        status: Status.inExchange,
      },
      provider: ride.provider,
      shouldSendImmediately: true,
      time: dayjs(now + getOffInExchangeTime + minutesInMs(1)),
    },
    {
      token: ride.token,
      state: {
        delay: 4,
        nextStationId: 60,
        status: Status.inTransit,
      },
      provider: ride.provider,
      shouldSendImmediately: false,
      time: dayjs(now + exchangeDuration - minutesInMs(3)),
      alert: {
        title: "Prepare to exit the train",
        text: "The train arriving soon at Jerusalem - Yitzhak Navon.",
      },
    },
    {
      token: ride.token,
      state: {
        delay: 4,
        nextStationId: 60,
        status: Status.getOff,
      },
      provider: ride.provider,
      shouldSendImmediately: true,
      time: dayjs(now + exchangeDuration - minutesInMs(1)),
      alert: {
        title: "Time to get off!",
        text: "The train arrives at Jerusalem - Yitzhak Navon. Get ready to exit!",
      },
    },
    {
      token: ride.token,
      state: {
        delay: 4,
        nextStationId: 60,
        status: Status.arrived,
      },
      provider: ride.provider,
      shouldSendImmediately: true,
      time: dayjs(now + exchangeDuration),
    },
  ])
})
