import { getTimeZone } from "react-native-localize"

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
    const inIsrael = getTimeZone() === "Asia/Jerusalem"

    if (inIsrael) {
      return API_CONFIG.DIRECT_RAIL_API
    } else {
      return API_CONFIG.PROXY_RAIL_API
    }
  } catch (error) {
    return API_CONFIG.DIRECT_RAIL_API
  }
}

export function getRailApiKey(): string {
  return "5e64d66cf03f4547bcac5de2de06b566"
}
