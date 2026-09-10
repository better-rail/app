import { Platform } from "react-native"

const env: string = "production"
const envPath = env === "production" ? "" : "-" + env

// `env = "local"` targets `bun run dev` in apps/server. Not "localhost": the web dev
// server holds port 3000 on IPv6 loopback. Use your LAN IP for a physical device.
const localHost = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1"

export const serverBaseURL =
  env === "production"
    ? "https://api.better-rail.co.il/api/v1"
    : env === "local"
      ? `http://${localHost}:3000/api/v1`
      : `https://better-rail${envPath}.up.railway.app/api/v1`

export const API_CONFIG = {
  RAIL_API: `${serverBaseURL}/rail-api`,
  FARES: `${serverBaseURL}/fares`,
}
