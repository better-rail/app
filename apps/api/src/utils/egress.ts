/**
 * egress.ts — outbound requests to the two upstreams a Worker cannot reach on its own.
 *
 * Workers egress from shared Cloudflare addresses: the MOT SIRI API only answers
 * an allow-listed IP, and the Israel Railways API is geo-fenced to Israel. When
 * EGRESS_PROXY_URL is set, requests to those hosts go through apps/egress-proxy
 * (a tiny relay on a fixed-IP host) as `GET|POST <proxy>/fetch?url=<target>`,
 * authenticated with EGRESS_PROXY_TOKEN; the relay also applies the upstreams'
 * TLS quirks (SIRI_CA_PEM, RAIL_TLS_INSECURE) and the rail API's PROXY_URL,
 * none of which a Worker's fetch can express. Unset, the upstream is called
 * directly — which works the day MOT allow-lists the Worker's egress.
 */
import { config } from "../config"

export const isRelayedHost = (url: string): boolean => {
  const host = safeHost(url)
  if (!host) return false
  return [config.siriUrl, config.railUrl].some((base) => safeHost(base) === host)
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
