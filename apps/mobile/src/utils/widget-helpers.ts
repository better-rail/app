import { NativeModules, Platform } from "react-native"
import { setAnalyticsUserProperties } from "@/services/analytics"

const { RNBetterRail, WidgetNavigation } = NativeModules

async function getInstalledWidgetFamilies(): Promise<string[]> {
  try {
    if (Platform.OS === "ios") {
      return await RNBetterRail.getInstalledWidgets()
    } else {
      return await WidgetNavigation.getInstalledWidgets()
    }
  } catch {
    return []
  }
}

export async function trackInstalledWidgets() {
  const families = await getInstalledWidgetFamilies()
  if (families.length === 0) return

  const properties: Record<string, string> = { widget_installed: "true" }

  if (Platform.OS === "ios") {
    if (families.includes("small")) properties.widget_small = "true"
    if (families.includes("medium")) properties.widget_medium = "true"
    if (families.includes("large")) properties.widget_large = "true"
    if (
      families.includes("accessoryCircular") ||
      families.includes("accessoryInline") ||
      families.includes("accessoryRectangular")
    ) {
      properties.widget_lock_screen = "true"
    }
  } else {
    if (families.includes("compact")) properties.widget_compact = "true"
    if (families.includes("wide")) properties.widget_wide = "true"
  }

  setAnalyticsUserProperties(properties)
}

/** Opens the Android pin-widget dialog. Resolves false when the launcher doesn't support it. */
export async function requestPinAndroidWidget(prefill?: { originId?: string; destinationId?: string }): Promise<boolean> {
  if (Platform.OS !== "android") return false
  try {
    return (await WidgetNavigation.requestPinWidget(prefill?.originId ?? "", prefill?.destinationId ?? "")) === true
  } catch {
    return false
  }
}
