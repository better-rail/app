import { Dayjs } from "dayjs"

export type NotificationPayload = {
  time: Dayjs
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

export type IndexedNotificationPayload = NotificationPayload & {
  id: number
}
