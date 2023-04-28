import { Dayjs } from "dayjs"

export enum Status {
  getOff = "getOff",
  arrived = "arrived",
  inTransit = "inTransit",
  inExchange = "inExchange",
  waitForTrain = "waitForTrain",
}

export enum Provider {
  ios = "ios",
  android = "android",
}

export type BuildNotificationPayload = {
  time: Dayjs
  token: string
  provider: Provider
  shouldSendImmediately?: boolean
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
