/**
 * config.ts — the server's settings, read from the Worker's variables and secrets.
 *
 * Getters, not constants: Workers only expose `env` once a handler runs (see
 * runtime.ts), so each setting is read when it is used. The names and defaults
 * are the Bun server's, so a deployment carries its variables over unchanged.
 */
import { variable } from "./runtime"

type Environment = "production" | "preview" | "test"

const flag = (name: string) => variable(name) === "true"
const num = (name: string, fallback: number) => Number(variable(name)) || fallback

/**
 * A secret that may be stored base64-encoded (`base64 -w0 file | wrangler secret put NAME`),
 * which sidesteps every newline-escaping trap a PEM or a JSON key file can fall into. A
 * plain value is returned as is; a base64 value is decoded when it decodes to text that
 * starts the way the secret must (`expectedStart`).
 */
export const decodeSecret = (value: string | undefined, expectedStart: string): string => {
  if (!value) return ""
  const trimmed = value.trim()
  if (trimmed.startsWith(expectedStart)) return trimmed
  if (!/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) return trimmed
  try {
    const bytes = atob(trimmed.replace(/\s+/g, ""))
    const decoded = new TextDecoder().decode(Uint8Array.from(bytes, (c) => c.charCodeAt(0))).trim()
    return decoded.startsWith(expectedStart) ? decoded : trimmed
  } catch {
    return trimmed
  }
}

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
  /** The APNs .p8 key: PEM text (with real or `\n`-escaped newlines) or its base64 encoding. */
  get appleKeyContent() {
    return decodeSecret(variable("APPLE_KEY_CONTENT"), "-----BEGIN").replace(/\\n/g, "\n")
  },
  /** APNs host: production or the sandbox (`APN_ENV`). */
  get appleApnHost() {
    return variable("APN_ENV") === "production" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com"
  },
  /** The Firebase service-account JSON, as text or base64 (`base64 -w0 service-account.json`). */
  get firebaseAdminAuth(): { project_id?: string; client_email?: string; private_key?: string } {
    try {
      return JSON.parse(decodeSecret(variable("FIREBASE_ADMIN_AUTH"), "{") || "{}")
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

  // --- service status ---------------------------------------------------------
  /**
   * Whether this deployment takes station alert / Delay Notifications subscriptions and
   * watches them (src/alerts/alerts-do.ts). They push to real riders' devices, so like
   * the rides it is on unless STATION_ALERTS_ENABLED=false (a Preview, a local run).
   */
  get stationAlertsEnabled() {
    return variable("STATION_ALERTS_ENABLED") !== "false"
  },
  /** How often the subscribed stations and guarded trains are checked. */
  get stationAlertsCheckSeconds() {
    return num("STATION_ALERTS_CHECK_SECONDS", 60)
  },
  /**
   * Israel Railways' published service updates → announced disruptions on the status screens,
   * read by a Claude model whenever the feed changes (src/service-status/announcements.ts).
   * Idle without ANTHROPIC_API_KEY.
   */
  get anthropicApiKey() {
    return variable("ANTHROPIC_API_KEY") ?? ""
  },
  get anthropicModel() {
    return variable("ANTHROPIC_MODEL") || "claude-opus-5-5"
  },
  /** Effort for the extraction ("low" … "max"); the model's default when empty. */
  get anthropicEffort() {
    return variable("ANTHROPIC_EFFORT") ?? "medium"
  },
  get announcementsPollSeconds() {
    return num("ANNOUNCEMENTS_POLL_SECONDS", 300)
  },
  /** Israel Railways' own timetable compared with the GTFS schedule (src/service-status/timetable.ts). */
  get timetableCheckSeconds() {
    return num("TIMETABLE_CHECK_SECONDS", 300)
  },
  /** How far ahead (minutes of scheduled departure) the check looks. */
  get timetableWindowMinutes() {
    return num("TIMETABLE_WINDOW_MINUTES", 120)
  },
  /** A check older than this is not laid over the status (three poll cycles). */
  get timetableStaleSeconds() {
    return num("TIMETABLE_STALE_SECONDS", 900)
  },
}
