import { Platform } from "react-native"

const env: string = "production"
const envPath = env === "production" ? "" : "-" + env

// `env = "local"` targets `bun run api:dev` (wrangler dev, port 8787) in apps/api. Not "localhost":
// the web dev server holds port 3000 on IPv6 loopback. Use your LAN IP for a physical device.
const localHost = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1"

// Any other env is a Workers Preview of the API (`wrangler preview` on a branch, or a non-production branch build).
export const serverBaseURL =
  env === "production"
    ? "https://api.better-rail.co.il/api/v1"
    : env === "local"
      ? `http://${localHost}:8787/api/v1`
      : `https://api${envPath}.better-rail.co.il/api/v1`

export const API_CONFIG = {
  RAIL_API: `${serverBaseURL}/rail-api`,
  FARES: `${serverBaseURL}/fares`,
}

// Israel Rail's own API, called directly for Jerusalem vouchers. The key is the one rail.co.il ships publicly.
export const RAIL_WEBSITE_API = {
  BASE_URL: "https://rail-api.rail.co.il/common/api/v1",
  SUBSCRIPTION_KEY: "5e64d66cf03f4547bcac5de2de06b566",
}
