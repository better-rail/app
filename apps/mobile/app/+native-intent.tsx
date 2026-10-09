import { isWebsiteURL } from "@/utils/helpers/web-links"

// Defer widget, live-activity and website navigation to useDeepLinking until app state loads.
const MANUAL_DEEP_LINK = /^(widget|liveactivity):\/\/|^betterrail:\/\/((modern_)?widget\w*|liveactivity)([/?#]|$)/

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  try {
    if (MANUAL_DEEP_LINK.test(path.toLowerCase()) || isWebsiteURL(path)) {
      return null
    }
  } catch {
    // Never throw from here — it can crash the app on launch. Fall through to
    // the default behavior on any unexpected input.
  }

  return path || null
}
