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
