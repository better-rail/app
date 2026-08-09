// API endpoints configuration.
//
// All rail data comes from the Better Rail server (GTFS-backed timetable +
// SIRI realtime). The Israel Railways API is not used at all anymore — the
// legacy announcements / popup messages / station info endpoints are retired
// on the server and answer empty. The client never calls rail.co.il and ships
// no API key.
const env: string = "production"
const envPath = env === "production" ? "" : "-" + env
// TEMP: point to Railway; revert host to api.better-rail.co.il
const serverBaseURL =
  env === "production" ? "https://better-rail.up.railway.app/api/v1" : `https://better-rail${envPath}.up.railway.app/api/v1`

export const API_CONFIG = {
  // Base for rail endpoints on our server (legacy Israel Railways API surface).
  RAIL_API: `${serverBaseURL}/rail-api`,
}
