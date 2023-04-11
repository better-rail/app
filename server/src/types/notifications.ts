import { Dayjs } from "dayjs"

export enum Status {
  getOn = "getOn",
  getOff = "getOff",
  arrived = "arrived",
  inTransit = "inTransit",
  inExchange = "inExchange",
  waitForTrain = "waitForTrain",
}

export type BuildNotificationPayload = {
  time: Dayjs
  token: string
  state: {
    nextStationId: number
    delay: number
    status: Status
  }
  alert?: {
    title: string
    text: string
  }
}

export type NotificationPayload = BuildNotificationPayload & {
  id: number
}

export type ApnToken = {
  creationDate: Dayjs
  value: string
}
