import { getCalendars } from "expo-localization"

// API endpoints configuration
export const API_CONFIG = {
  // Direct rail API endpoint (for users in Israel)
  DIRECT_RAIL_API: "https://rail-api.rail.co.il",

  // Proxy endpoint (for users outside Israel)
  // Update this URL to your actual server domain
  PROXY_RAIL_API: "https://api.better-rail.co.il/api/v1/rail-api",
}

export function getRailApiBaseUrl(): string {
  try {
    const isInIsrael = getCalendars()[0].timeZone === "Asia/Jerusalem"

    if (isInIsrael) {
      return API_CONFIG.DIRECT_RAIL_API
    } else {
      return API_CONFIG.PROXY_RAIL_API
    }
  } catch (error) {
    return API_CONFIG.DIRECT_RAIL_API
  }
}

export const railApiKey = "5e64d66cf03f4547bcac5de2de06b566"
