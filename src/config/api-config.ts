const env: string = "production"
const envPath = env === "production" ? "" : "-" + env
// TEMP: point to Railway; revert host to api.better-rail.co.il
const serverBaseURL =
  env === "production" ? "https://better-rail.up.railway.app/api/v1" : `https://better-rail${envPath}.up.railway.app/api/v1`

export const API_CONFIG = {
  RAIL_API: `${serverBaseURL}/rail-api`,
}
