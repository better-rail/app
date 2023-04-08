import { Dayjs } from "dayjs"

export type BuildNotificationPayload = {
  time: Dayjs
  token: string
  state: {
    nextStationId: number
    delay: number
    inExchange: boolean
    arrived: boolean
  }
  alert?: {
    title: string
    text: string
  }
}

export type NotificationPayload = BuildNotificationPayload & {
  id: number
}
