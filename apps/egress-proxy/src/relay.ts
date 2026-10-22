/**
 * relay.ts — the whole proxy: auth, the host allow list, and the forwarded fetch.
 *
 * The Worker cannot reach the MOT SIRI API (IP allow-listed, incomplete TLS
 * chain) or the Israel Railways API (geo-fenced, reached through PROXY_URL), so
 * it sends `METHOD /fetch?url=<target>` here and this process makes the real
 * call with Bun's per-request `tls` / `proxy` options. Two things keep it from
 * becoming an open proxy: a bearer token, and a target host that must be one of
 * the configured upstreams. Redirects are not followed for the same reason.
 *
 * The SIRI access key travels in the target's query string (`?Key=`), so the
 * query never reaches a log line or an error body.
 */
import { createHash, timingSafeEqual } from "node:crypto"

export type Upstream = {
  name: "siri" | "rail"
  /** `host:port` of the configured base URL; the only hosts a target may name. */
  host: string
  /** `https:` normally; `http:` only when the configured upstream itself is plain http (tests). */
  protocol: string
  /** Bun-specific fetch options for this host: TLS overrides and the outbound HTTP proxy. */
  init: Pick<BunFetchRequestInit, "tls" | "proxy">
}

export type RelayConfig = {
  token: string
  upstreams: Upstream[]
  timeoutMs: number
  log: (line: string) => void
}

export type RelayEnv = Record<string, string | undefined>

export const DEFAULT_TIMEOUT_MS = 60_000

const HOP_BY_HOP_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "keep-alive",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "upgrade",
  // Ours, not the upstream's.
  "authorization",
])

const NULL_BODY_STATUSES = new Set([101, 204, 205, 304])

export const redactKey = (text: string): string => text.replace(/Key=[^&\s]*/gi, "Key=***")

const parseUpstream = (name: Upstream["name"], variable: string, raw: string | undefined): URL | undefined => {
  if (!raw) return undefined
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`egress-proxy: ${variable} is not an absolute URL`)
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`egress-proxy: ${variable} must be an http(s) URL`)
  }
  return url
}

/** Builds the config from environment variables; throws when the service must not start. */
export const loadConfig = (env: RelayEnv): RelayConfig => {
  const token = env.EGRESS_PROXY_TOKEN?.trim()
  if (!token) throw new Error("egress-proxy: EGRESS_PROXY_TOKEN is not set, refusing to start as an open proxy")

  const upstreams: Upstream[] = []

  const siri = parseUpstream("siri", "SIRI_URL", env.SIRI_URL)
  if (siri) {
    const caPem = env.SIRI_CA_PEM?.replace(/\\n/g, "\n").trim()
    const tls = caPem ? { ca: caPem } : env.SIRI_TLS_INSECURE === "true" ? { rejectUnauthorized: false } : undefined
    upstreams.push({ name: "siri", host: siri.host, protocol: siri.protocol, init: tls ? { tls } : {} })
  }

  const rail = parseUpstream("rail", "RAIL_URL", env.RAIL_URL)
  if (rail) {
    const init: Upstream["init"] = {}
    if (env.PROXY_URL) init.proxy = env.PROXY_URL
    if (env.RAIL_TLS_INSECURE === "true") init.tls = { rejectUnauthorized: false }
    upstreams.push({ name: "rail", host: rail.host, protocol: rail.protocol, init })
  }

  const timeoutMs = Number(env.EGRESS_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS

  return { token, upstreams, timeoutMs, log: (line) => console.info(line) }
}

const json = (status: number, body: Record<string, unknown>): Response =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } })

// Hashing first makes the comparison length-independent, so `timingSafeEqual`
// never throws on a wrong-length token and leaks nothing about the real one.
const tokenMatches = (header: string | null, token: string): boolean => {
  const presented = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!presented) return false
  const digest = (value: string) => createHash("sha256").update(value).digest()
  return timingSafeEqual(digest(presented), digest(token))
}

/** The upstream a target URL is allowed to reach, or `undefined` when it must be refused. */
export const resolveUpstream = (target: URL, upstreams: Upstream[]): Upstream | undefined => {
  if (!target.username && !target.password) {
    for (const upstream of upstreams) {
      if (target.host !== upstream.host) continue
      if (target.protocol === "https:" || target.protocol === upstream.protocol) return upstream
    }
  }
  return undefined
}

const forwardHeaders = (incoming: Headers): Headers => {
  const headers = new Headers()
  incoming.forEach((value, name) => {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) headers.append(name, value)
  })
  return headers
}

const isTimeout = (error: unknown, signal: AbortSignal): boolean =>
  signal.aborted || (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"))

export const createRelay = (config: RelayConfig): ((request: Request) => Promise<Response>) => {
  return async (request) => {
    const url = new URL(request.url)

    if (url.pathname === "/health") {
      return request.method === "GET" ? new Response("ok") : new Response("method not allowed", { status: 405 })
    }
    if (url.pathname !== "/fetch") return json(404, { error: "not found" })

    if (!config.token) return json(500, { error: "egress proxy has no EGRESS_PROXY_TOKEN" })
    if (!tokenMatches(request.headers.get("authorization"), config.token)) {
      return json(401, { error: "unauthorized" })
    }

    const rawTarget = url.searchParams.get("url")
    if (!rawTarget) return json(400, { error: "missing url parameter" })
    let target: URL
    try {
      target = new URL(rawTarget)
    } catch {
      return json(400, { error: "url must be absolute" })
    }
    const upstream = resolveUpstream(target, config.upstreams)
    if (!upstream) return json(403, { error: "target host is not allow-listed", host: target.host })

    // Everything the log line and error bodies may mention: host and path, never the query.
    const label = `${request.method} ${target.host}${target.pathname}`
    const signal = AbortSignal.timeout(config.timeoutMs)
    const hasBody = request.method !== "GET" && request.method !== "HEAD"

    let response: Response
    try {
      response = await fetch(target, {
        ...upstream.init,
        method: request.method,
        headers: forwardHeaders(request.headers),
        body: hasBody ? request.body : undefined,
        signal,
        redirect: "manual",
      })
    } catch (error) {
      if (isTimeout(error, signal)) {
        config.log(`${label} -> timeout after ${config.timeoutMs}ms`)
        return json(504, { error: "upstream timeout" })
      }
      const detail = redactKey(error instanceof Error ? error.message : String(error)).replace(target.search || "?", "?***")
      config.log(`${label} -> ${detail}`)
      return json(502, { error: "upstream unreachable", detail })
    }

    config.log(`${label} -> ${response.status}`)

    const headers = new Headers({ "x-egress-upstream-status": String(response.status) })
    const contentType = response.headers.get("content-type")
    if (contentType) headers.set("content-type", contentType)
    const location = response.headers.get("location")
    if (location) headers.set("location", location)

    const body = NULL_BODY_STATUSES.has(response.status) || request.method === "HEAD" ? null : response.body
    return new Response(body, { status: response.status, headers })
  }
}
