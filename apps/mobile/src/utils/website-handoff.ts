import { Platform } from "react-native"
import { requireOptionalNativeModule } from "expo"
import { isWebsiteURL } from "./helpers/web-links"

interface WebsiteHandoffModule {
  activities: { INDEXED_ROUTE: string }
  createActivity(activity: {
    id: string
    activityType: string
    title: string
    webpageURL: string
    userInfo: { href: string }
    isEligibleForHandoff: boolean
    isEligibleForSearch: boolean
  }): void
  revokeActivity(id: string): void
  getLaunchActivity(): { userInfo?: { href?: string }; webpageURL?: string } | null
}

export const websiteHandoff = Platform.OS === "ios" ? requireOptionalNativeModule<WebsiteHandoffModule>("ExpoHead") : null

// React Native's initial URL doesn't include app-to-app Handoff.
export function getInitialWebsiteHandoffURL(): string | null {
  const activity = websiteHandoff?.getLaunchActivity()
  const webpageURL = activity?.webpageURL
  if (webpageURL && isWebsiteURL(webpageURL)) return webpageURL
  const href = activity?.userInfo?.href
  return href && isWebsiteURL(href) ? href : null
}
