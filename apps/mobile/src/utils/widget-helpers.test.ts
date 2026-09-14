import { afterEach, describe, expect, mock, test } from "bun:test"
import { NativeModules, Platform } from "react-native"
import { getCachedPosthogProperties } from "@/services/analytics/posthog-user-properties"

const getInstalledWidgets = mock(() => Promise.resolve<string[]>([]))
NativeModules.RNBetterRail = { getInstalledWidgets }
NativeModules.WidgetNavigation = { getInstalledWidgets }

// Required after mocking, since widget-helpers reads NativeModules on import
const { getWidgetFamilyFromURL, trackInstalledWidgets } = require("./widget-helpers") as typeof import("./widget-helpers")

const setPlatform = (os: string) => {
  ;(Platform as { OS: string }).OS = os
}

describe("trackInstalledWidgets", () => {
  afterEach(() => setPlatform("ios"))

  test("reports every iOS family, including the missing ones", async () => {
    getInstalledWidgets.mockResolvedValueOnce(["medium", "accessoryInline", "extraLargePortrait"])
    await trackInstalledWidgets()
    expect(getCachedPosthogProperties()).toMatchObject({
      widget_installed: "true",
      widget_small: "false",
      widget_medium: "true",
      widget_large: "false",
      widget_extra_large: "true",
      widget_lock_screen: "true",
    })
  })

  test("clears the properties once every widget is removed", async () => {
    getInstalledWidgets.mockResolvedValueOnce([])
    await trackInstalledWidgets()
    expect(getCachedPosthogProperties()).toMatchObject({
      widget_installed: "false",
      widget_small: "false",
      widget_medium: "false",
      widget_large: "false",
      widget_extra_large: "false",
      widget_lock_screen: "false",
    })
  })

  test("reports the Android families on Android", async () => {
    setPlatform("android")
    getInstalledWidgets.mockResolvedValueOnce(["wide"])
    await trackInstalledWidgets()
    expect(getCachedPosthogProperties()).toMatchObject({
      widget_installed: "true",
      widget_compact: "false",
      widget_wide: "true",
      widget_large: "false",
    })
  })

  test("leaves the properties untouched when the lookup fails", async () => {
    const before = getCachedPosthogProperties()
    getInstalledWidgets.mockRejectedValueOnce(new Error("unavailable"))
    await trackInstalledWidgets()
    expect(getCachedPosthogProperties()).toEqual(before)
  })
})

describe("getWidgetFamilyFromURL", () => {
  test("reads the iOS family param", () => {
    expect(getWidgetFamilyFromURL("widget://route?originId=4600&destinationId=680&family=small")).toBe("small")
  })

  test("maps the Android widget type", () => {
    expect(getWidgetFamilyFromURL("betterrail://modern_widget2x2?originId=4600&destinationId=680")).toBe("compact")
    expect(getWidgetFamilyFromURL("betterrail://modern_widget4x2?originId=4600&destinationId=680")).toBe("wide")
    expect(getWidgetFamilyFromURL("betterrail://modern_widget4x3?originId=4600&destinationId=680")).toBe("large")
  })

  test("is undefined for links from builds that don't send a family", () => {
    expect(getWidgetFamilyFromURL("widget://route?originId=4600&destinationId=680")).toBeUndefined()
  })
})
