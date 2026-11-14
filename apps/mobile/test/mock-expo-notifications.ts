import { mock } from "bun:test"

/** The push token tests get from `getDevicePushTokenAsync`. */
export const MOCK_PUSH_TOKEN = "apns-token"

mock.module("expo-notifications", () => ({
  getDevicePushTokenAsync: async () => ({ type: "ios", data: MOCK_PUSH_TOKEN }),
  addPushTokenListener: () => ({ remove() {} }),
  scheduleNotificationAsync: async () => "",
}))
