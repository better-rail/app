import { Platform } from "react-native"

/**
 * Where the app's own server lives. Production unless a gitignored `.env.local` says otherwise:
 *
 *   EXPO_PUBLIC_API_ENV=local                              `bun run dev` in apps/server, on this machine
 *   EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api/v1    any base URL outright (a physical device, a preview)
 *
 * EXPO_PUBLIC_* values are inlined into the bundle by babel-preset-expo, so after changing them
 * restart Metro with `-c`. Neither override is ever set in an EAS build profile.
 */
type ApiEnv = "production" | "local"

const apiEnv: ApiEnv = process.env.EXPO_PUBLIC_API_ENV === "local" ? "local" : "production"

// Not "localhost": the web dev server holds port 3000 on IPv6 loopback. Android emulators reach
// the host through 10.0.2.2. A physical device needs EXPO_PUBLIC_API_URL with the LAN IP.
const localHost = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1"

const defaultBaseURL = apiEnv === "local" ? `http://${localHost}:3000/api/v1` : "https://api.better-rail.co.il/api/v1"

export const serverBaseURL = (process.env.EXPO_PUBLIC_API_URL || defaultBaseURL).replace(/\/+$/, "")

export const API_CONFIG = {
  RAIL_API: `${serverBaseURL}/rail-api`,
  SERVICE_STATUS: `${serverBaseURL}/service-status`,
  STATIONS: `${serverBaseURL}/stations`,
  STATION_ALERTS: `${serverBaseURL}/station-alerts`,
  DELAY_GUARDS: `${serverBaseURL}/delay-guards`,
  FARES: `${serverBaseURL}/fares`,
}
