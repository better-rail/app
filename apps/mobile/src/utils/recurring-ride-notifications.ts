/**
 * recurring-ride-notifications.ts — the reminder the server sends before a recurring ride leaves.
 *
 * iOS shows it as a regular alert. Android gets a data message (like the live ride updates) and the app posts it
 * as a local notification, so a tap reaches the same expo-notifications response listener on both platforms.
 */
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

export const RECURRING_RIDE_TYPE = "recurring-ride"
const REMINDERS_CHANNEL = "better-rail"

/** What the reminder carries for opening the route. */
export type RecurringRideReminder = {
  recurringRideId: string
  originId: number
  destinationId: number
  /** The departure, in ms */
  departureAt: number
}

const parse = (raw: Record<string, unknown>): RecurringRideReminder | null => {
  const reminder = {
    recurringRideId: String(raw.recurringRideId ?? ""),
    originId: Number(raw.originId),
    destinationId: Number(raw.destinationId),
    departureAt: Number(raw.departureAt),
  }
  const valid =
    reminder.recurringRideId &&
    Number.isInteger(reminder.originId) &&
    Number.isInteger(reminder.destinationId) &&
    Number.isFinite(reminder.departureAt)
  return valid ? reminder : null
}

/** The reminder in a notification's data, wherever expo-notifications nested it. */
export const findRecurringRideReminder = (raw: unknown, depth = 0): RecurringRideReminder | null => {
  if (!raw || typeof raw !== "object" || depth > 5) return null
  const record = raw as Record<string, unknown>
  if (record.type === RECURRING_RIDE_TYPE) return parse(record)
  for (const value of Object.values(record)) {
    const found = findRecurringRideReminder(value, depth + 1)
    if (found) return found
  }
  return null
}

/**
 * Whether expo-notifications should present a notification while the app is open: only a reminder. On Android
 * that's the local one the app posts, not the data message it came in.
 */
export const shouldPresentNotification = (notification: Notifications.Notification) => {
  // On iOS a push's custom keys sit in the trigger's payload, not in `content.data`.
  if (!findRecurringRideReminder(notification.request)) return false
  return Platform.OS === "ios" || (notification.request.trigger as { type?: string } | null)?.type !== "push"
}

/** Android: post the reminder that arrived as a data message. */
export const postAndroidReminder = async (data: Record<string, string>) => {
  const reminder = findRecurringRideReminder(data)
  if (!reminder || !data.title) return
  await Notifications.scheduleNotificationAsync({
    identifier: `recurring-ride-${reminder.recurringRideId}`,
    content: {
      title: data.title,
      body: data.body,
      data: { type: RECURRING_RIDE_TYPE, ...reminder },
    },
    trigger: { channelId: REMINDERS_CHANNEL },
  })
}
