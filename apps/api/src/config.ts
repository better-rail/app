/**
 * config.ts — the server's settings, read from the Worker's variables and secrets.
 *
 * Getters, not constants: Workers only expose `env` once a handler runs (see
 * runtime.ts), so each setting is read when it is used. The names and defaults
 * are the Bun server's, so a deployment carries its variables over unchanged.
 */
import { variable } from "./runtime"

type Environment = "production" | "test"

const flag = (name: string) => variable(name) === "true"
const num = (name: string, fallback: number) => Number(variable(name)) || fallback

export const config = {
  get env(): Environment {
    return (variable("NODE_ENV") as Environment) || "test"
  },

  // --- push -------------------------------------------------------------------
  get appleBundleId() {
    return variable("APPLE_BUNDLE_ID") ?? ""
  },
  get appleTeamId() {
    return variable("APPLE_TEAM_ID") ?? ""
  },
  get appleKeyId() {
    return variable("APPLE_KEY_ID") ?? ""
  },
  get appleKeyContent() {
    return variable("APPLE_KEY_CONTENT")?.replace(/\\n/g, "\n") ?? ""
  },
  /** APNs host: production or the sandbox (`APN_ENV`). */
  get appleApnHost() {
    return variable("APN_ENV") === "production" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com"
  },
  get firebaseAdminAuth(): { project_id?: string; client_email?: string; private_key?: string } {
    try {
      return JSON.parse(variable("FIREBASE_ADMIN_AUTH") || "{}")
    } catch {
      return {}
    }
  },

  /**
   * Whether this deployment tracks rides. Rides live in Durable Objects, which
   * are per-deployment (a local `wrangler dev` has its own), so the Bun
   * server's "is this the deployed service" guard is no longer needed: tracking
   * is on unless RIDES_ENABLED=false.
   */
  get ridesEnabled() {
    return variable("RIDES_ENABLED") !== "false"
  },

  // --- timetable source -------------------------------------------------------
  get railDataSource(): "gtfs" | "rail" {
    return variable("RAIL_DATA_SOURCE") === "rail" ? "rail" : "gtfs"
  },
  get railUrl() {
    return variable("RAIL_URL") ?? ""
  },
  get railApiKey() {
    return variable("RAIL_API_KEY") ?? ""
  },
  /** Only read by the egress proxy (an HTTP proxy with an Israeli egress for the rail API, should it ever need one). */
  get proxyUrl() {
    return variable("PROXY_URL") ?? ""
  },
  get railTlsInsecure() {
    return flag("RAIL_TLS_INSECURE")
  },

  // --- egress proxy -----------------------------------------------------------
  /**
   * Base URL of the egress proxy (apps/egress-proxy) that fronts the two
   * IP/geo-fenced upstreams. Workers egress from shared Cloudflare addresses, so
   * the MOT SIRI allow-list and the rail API geo-fence need a fixed-IP relay.
   * Unset = call the upstreams directly.
   */
  get egressProxyUrl() {
    return variable("EGRESS_PROXY_URL") ?? ""
  },
  get egressProxyToken() {
    return variable("EGRESS_PROXY_TOKEN") ?? ""
  },

  // --- SIRI -------------------------------------------------------------------
  get siriUrl() {
    return variable("SIRI_URL") ?? ""
  },
  get siriKey() {
    return variable("SIRI_KEY") ?? ""
  },
  get siriDebugToken() {
    return variable("SIRI_DEBUG_TOKEN") ?? ""
  },
  get siriPollSeconds() {
    return num("SIRI_POLL_SECONDS", 30)
  },
  get siriPreviewInterval() {
    return variable("SIRI_PREVIEW_INTERVAL") || "PT90M"
  },
  get siriChunkSize() {
    return num("SIRI_CHUNK_SIZE", 70)
  },
  get siriStaleSeconds() {
    return num("SIRI_STALE_SECONDS", 600)
  },
  get siriCarrySeconds() {
    return num("SIRI_CARRY_SECONDS", 86_400)
  },

  // --- ingest / fares ---------------------------------------------------------
  /** Bearer token the ingest container and `bun run rail:pull` present to the /internal routes. */
  get ingestToken() {
    return variable("INGEST_TOKEN") ?? ""
  },
  /** The Worker's own public base URL, handed to the ingest container so it can post the feed back. */
  get apiBaseUrl() {
    return variable("API_BASE_URL") ?? ""
  },
  get sentryDsn() {
    return variable("SENTRY_DSN") ?? ""
  },
}
