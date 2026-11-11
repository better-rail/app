/**
 * target.ts — where the ingest job reaches the Worker.
 *
 * The Worker mounts every route under /api/v1 (src/app.ts), and the job is
 * handed the Worker's bare origin (API_BASE_URL, or --target), the same
 * convention as `rail:pull`. Kept apart from main.ts, which runs on import,
 * so the tests can check these URLs against the Worker's real router.
 */
export const API_PREFIX = "/api/v1"

/** The Worker's origin from a configured base URL; a trailing slash or an already-added prefix is tolerated. */
export const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "").replace(/\/api\/v1$/, "")

/** The URL of an `/internal` route (`ingest`, `ingest/active`) on the Worker at `baseUrl`. */
export const internalUrl = (baseUrl: string, route: string) => `${baseUrl}${API_PREFIX}/internal/${route}`
