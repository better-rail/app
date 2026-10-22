/**
 * egress.ts — outbound requests to the upstream a Worker cannot reach on its own.
 *
 * Workers egress from shared Cloudflare addresses, and the MOT SIRI API only
 * answers one allow-listed IP (and serves an incomplete TLS chain). When
 * EGRESS_PROXY_URL is set, requests to that host go through apps/egress-proxy
 * (a tiny relay on a fixed-IP host) as `GET|POST <proxy>/fetch?url=<target>`,
 * authenticated with EGRESS_PROXY_TOKEN; the relay applies the TLS quirk
 * (SIRI_CA_PEM / SIRI_TLS_INSECURE) on its side. Unset, the upstream is called
 * directly — which works the day MOT allow-lists the Worker's egress.
 *
 * The Israel Railways API is reachable from a Worker directly (requests/rail-api.ts),
 * so it is relayed only when EGRESS_PROXY_RELAY_RAIL=true — the escape hatch for a
 * future geo-fence, since the proxy can tunnel through PROXY_URL.
 */
import { config } from "../config"
import { variable } from "../runtime"

export const isRelayedHost = (url: string): boolean => {
  const host = safeHost(url)
  if (!host) return false
  const relayed = [config.siriUrl]
  if (variable("EGRESS_PROXY_RELAY_RAIL") === "true") relayed.push(config.railUrl)
  return relayed.some((base) => Boolean(base) && safeHost(base) === host)
}

const safeHost = (url: string): string | null => {
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

/** `fetch` that is routed through the egress proxy for the relayed hosts. */
export const egressFetch = (url: string, init: RequestInit = {}): Promise<Response> => {
  const proxy = config.egressProxyUrl
  if (!proxy || !isRelayedHost(url)) return fetch(url, init)

  // Elysia's types pull Bun's HeadersInit into scope, which disagrees with the Workers one; a Request normalizes both.
  const relayed = new Request(`${proxy.replace(/\/$/, "")}/fetch?url=${encodeURIComponent(url)}`, init)
  relayed.headers.set("Authorization", `Bearer ${config.egressProxyToken}`)
  return fetch(relayed)
}
