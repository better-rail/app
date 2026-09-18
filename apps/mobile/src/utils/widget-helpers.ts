import { NativeModules, Platform } from "react-native"
import { setAnalyticsUserProperties } from "@/services/analytics"
import { extractURLParams } from "@/utils/helpers/url"

const { RNBetterRail, WidgetNavigation } = NativeModules

const IOS_FAMILY_PROPERTIES: Record<string, string> = {
  small: "widget_small",
  medium: "widget_medium",
  large: "widget_large",
  extraLargePortrait: "widget_extra_large",
  accessoryCircular: "widget_lock_screen",
  accessoryInline: "widget_lock_screen",
  accessoryRectangular: "widget_lock_screen",
}

const ANDROID_FAMILY_PROPERTIES: Record<string, string> = {
  compact: "widget_compact",
  wide: "widget_wide",
  large: "widget_large",
}

const ANDROID_WIDGET_TYPE_FAMILIES: Record<string, string> = {
  modern_widget2x2: "compact",
  modern_widget4x2: "wide",
  modern_widget4x3: "large",
}

// null on failure, so a failed lookup doesn't clear the properties
async function getInstalledWidgetFamilies(): Promise<string[] | null> {
  try {
    if (Platform.OS === "ios") {
      return await RNBetterRail.getInstalledWidgets()
    } else {
      return await WidgetNavigation.getInstalledWidgets()
    }
  } catch {
    return null
  }
}

export async function trackInstalledWidgets() {
  const families = await getInstalledWidgetFamilies()
  if (!families) return

  const familyProperties = Platform.OS === "ios" ? IOS_FAMILY_PROPERTIES : ANDROID_FAMILY_PROPERTIES
  // "false" too, so removed widgets get cleared
  const properties: Record<string, string> = { widget_installed: String(families.length > 0) }
  for (const property of Object.values(familyProperties)) {
    properties[property] = String(families.some((family) => familyProperties[family] === property))
  }

  setAnalyticsUserProperties(properties)
}

export function getWidgetFamilyFromURL(url: string): string | undefined {
  const { family } = extractURLParams(url)
  if (family) return family
  const host = url.match(/^betterrail:\/\/(\w+)/i)?.[1].toLowerCase()
  return host ? ANDROID_WIDGET_TYPE_FAMILIES[host] : undefined
}

export type WidgetFamily = "compact" | "wide" | "large"

/** Opens the Android pin-widget dialog. Resolves false when the launcher doesn't support it. */
export async function requestPinAndroidWidget(options?: {
  originId?: string
  destinationId?: string
  family?: WidgetFamily
}): Promise<boolean> {
  if (Platform.OS !== "android") return false
  try {
    return (
      (await WidgetNavigation?.requestPinWidget(
        options?.originId ?? "",
        options?.destinationId ?? "",
        options?.family ?? "wide",
      )) === true
    )
  } catch {
    return false
  }
}
