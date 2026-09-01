import { Alert, Linking, Platform } from "react-native"
import { translate } from "@/i18n"

export const SUPPORT_BETTER_RAIL_URL = "https://pages.greeninvoice.co.il/payments/links/696f6413-1068-4002-a0f7-6b9b6676ead5"

export async function openSupportBetterRail() {
  if (Platform.OS !== "android") return

  try {
    await Linking.openURL(SUPPORT_BETTER_RAIL_URL)
  } catch (error) {
    console.error("Failed to open the Better Rail support page", error)
    Alert.alert(translate("common.error") ?? "", translate("settings.supportLinkError") ?? "")
  }
}
