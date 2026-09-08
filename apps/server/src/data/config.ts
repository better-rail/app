import { Host } from "apns2"
import { config } from "dotenv"
config()

type Enviroment = "production" | "test"

export const env: Enviroment = (process.env.NODE_ENV as Enviroment) || "test"
export const port = process.env.PORT || 3000
export const redisUrl = process.env.REDIS_URL as string
export const databaseUrl = process.env.DATABASE_URL as string
export const appleBundleId = process.env.APPLE_BUNDLE_ID as string
export const appleTeamId = process.env.APPLE_TEAM_ID as string
export const appleKeyId = process.env.APPLE_KEY_ID as string
export const appleKeyContent = (process.env.APPLE_KEY_CONTENT as string)?.replace(/\\n/g, "\n")
export const appleApnHost = process.env.APN_ENV === "production" ? Host.production : Host.development
export const firebaseAdminAuth = JSON.parse(process.env.FIREBASE_ADMIN_AUTH || "{}")

/**
 * Whether this process tracks rides.
 *
 * Rides are shared state: the redis `rides:*` hashes and real users' push tokens.
 * A process that starts with tracking on picks up every active ride at boot
 * (`scheduleExistingRides`), schedules a second set of notifications for each and
 * deletes the ones it can't reschedule — so a local run pointed at the production
 * redis would push duplicates to real passengers and end their Live Activities.
 *
 * It's therefore opt-in: RIDES_ENABLED decides, and when it's unset the fallback is
 * "are we the deployed service?" — Railway injects RAILWAY_ENVIRONMENT_NAME/_ID into
 * every runtime container, and nothing sets them on a laptop. Set RIDES_ENABLED=true
 * on the deployment anyway, so tracking never hinges on Railway's variable names.
 *
 * With it off the boot reschedule is skipped and `/api/v1/ride/*` answers 503, so the
 * process never reads or writes ride state at all.
 */
const isDeployedService = Boolean(
  process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT_ID || process.env.RAILWAY_ENVIRONMENT,
)
export const ridesEnabled = process.env.RIDES_ENABLED ? process.env.RIDES_ENABLED === "true" : isDeployedService

/**
 * Where timetable data comes from.
 *
 * - "gtfs" (default) — the Ministry of Transport GTFS feed ingested into Postgres,
 *   enriched with SIRI realtime. Everything is served in-house.
 * - "rail" — the Israel Railways API, the way the server worked before the GTFS
 *   migration: `/rail-api/*` proxies straight through, and ride tracking reads its
 *   timetable. Needs RAIL_URL + RAIL_API_KEY, and PROXY_URL when the deployment's
 *   egress IP isn't in Israel (the API is geo-fenced).
 *
 * Read once at boot — flipping the source is a Railway variable change + restart.
 */
export type RailDataSource = "gtfs" | "rail"
export const railDataSource: RailDataSource = process.env.RAIL_DATA_SOURCE === "rail" ? "rail" : "gtfs"
export const railUrl = process.env.RAIL_URL as string
export const railApiKey = process.env.RAIL_API_KEY as string
export const proxyUrl = process.env.PROXY_URL as string
// The rail API has served an incomplete TLS chain before. Unlike the old client,
// which set NODE_TLS_REJECT_UNAUTHORIZED process-wide, this relaxes verification
// for requests to the rail API only.
export const railTlsInsecure = process.env.RAIL_TLS_INSECURE === "true"

// SIRI-SM real-time feed (MOT). The API is IP-allow-listed, so only the deployed
// poller can reach it; when SIRI_URL / SIRI_KEY are unset everything degrades to
// schedule-only results (delay 0, scheduled platforms).
export const siriUrl = process.env.SIRI_URL as string
export const siriKey = process.env.SIRI_KEY as string
// moran.mot.gov.il serves an incomplete TLS chain ("unable to verify the first
// certificate"). Preferred fix: paste the missing intermediate(+root) PEM into
// SIRI_CA_PEM (\n-escaped, like APPLE_KEY_CONTENT). Quick unblock:
// SIRI_TLS_INSECURE=true skips verification for SIRI requests only.
export const siriCaPem = (process.env.SIRI_CA_PEM as string)?.replace(/\\n/g, "\n")
export const siriTlsInsecure = process.env.SIRI_TLS_INSECURE === "true"
export const siriDebugToken = process.env.SIRI_DEBUG_TOKEN as string
export const siriPollSeconds = Number(process.env.SIRI_POLL_SECONDS) || 30
export const siriPreviewInterval = process.env.SIRI_PREVIEW_INTERVAL || "PT90M"
export const siriChunkSize = Number(process.env.SIRI_CHUNK_SIZE) || 70
export const siriStaleSeconds = Number(process.env.SIRI_STALE_SECONDS) || 600
// The feed only reports upcoming stop visits, so realtime data (platform
// changes, statuses, delays) would vanish the moment the train departs each
// stop. Last-known entries are carried forward in the snapshot for this long
// past their final sighting — a full day of history for every run.
export const siriCarrySeconds = Number(process.env.SIRI_CARRY_SECONDS) || 86_400
// "in-process" runs the poller inside the web service (fallback when the
// MOT-registered egress IP belongs to it); default is the standalone `bun run siri`.
export const siriPollerMode = process.env.SIRI_POLLER_MODE
