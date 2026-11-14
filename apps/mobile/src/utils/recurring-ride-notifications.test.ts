import { expect, test } from "bun:test"

import { findRecurringRideReminder } from "./recurring-ride-notifications"

test("finds the reminder in an iOS push's trigger payload and in Android's local notification data", () => {
  const reminder = { recurringRideId: "r1", originId: 3700, destinationId: 3500, departureAt: 1_700_000_000_000 }

  const iosRequest = {
    content: { title: "Your 07:45 train", data: {} },
    trigger: {
      type: "push",
      payload: {
        aps: { alert: {} },
        type: "recurring-ride",
        recurringRideId: "r1",
        originId: "3700",
        destinationId: "3500",
        departureAt: "1700000000000",
      },
    },
  }
  expect(findRecurringRideReminder(iosRequest)).toEqual(reminder)

  const androidRequest = { content: { data: { type: "recurring-ride", ...reminder } }, trigger: { channelId: "better-rail" } }
  expect(findRecurringRideReminder(androidRequest)).toEqual(reminder)

  expect(findRecurringRideReminder({ content: { data: { type: "live-ride" } } })).toBeNull()
})
