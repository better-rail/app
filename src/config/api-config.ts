const env: string = "production"
const envPath = env === "production" ? "" : "-" + env
const serverBaseURL =
  env === "production" ? "https://api.better-rail.co.il/api/v1" : `https://better-rail${envPath}.up.railway.app/api/v1`

export const API_CONFIG = {
  RAIL_API: `${serverBaseURL}/rail-api`,
}
