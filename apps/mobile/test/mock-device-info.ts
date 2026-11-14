import { mock } from "bun:test"

// The native module isn't there under bun; PostHog reads these at startup too.
const deviceInfo = {
  getVersion: () => "3.2.0",
  getBuildNumber: () => "1",
  getApplicationName: () => "Better Rail",
  getBundleId: () => "il.co.better-rail",
  getManufacturerSync: () => "Apple",
  getModel: () => "iPhone",
  getSystemName: () => "iOS",
  getSystemVersion: () => "26.0",
  isEmulatorSync: () => true,
}

mock.module("react-native-device-info", () => ({ default: deviceInfo, ...deviceInfo }))
