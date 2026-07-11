// API endpoints configuration.
//
// All rail data now flows through the Better Rail server: it serves the
// GTFS-backed timetable and proxies the not-yet-migrated Israel Railways
// endpoints (announcements, popup messages, station info). The client never
// calls rail.co.il directly and no longer ships an API key.
const env: string = "production"
const envPath = env === "production" ? "" : "-" + env
// TEMP: point to Railway; revert host to api.better-rail.co.il
const serverBaseURL =
  env === "production" ? "https://better-rail.up.railway.app/api/v1" : `https://better-rail${envPath}.up.railway.app/api/v1`

export const API_CONFIG = {
  // Base for rail endpoints on our server (timetable + proxied Israel Railways API).
  RAIL_API: `${serverBaseURL}/rail-api`,
}
