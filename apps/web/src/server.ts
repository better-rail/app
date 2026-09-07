import handler, { createServerEntry } from "@tanstack/react-start/server-entry"
import { fetchWithEdgeCache, withHeaders, type EdgeCache, type ExecutionContext } from "@/lib/edge-cache"

/**
 * Cloudflare Workers entry (`main` in wrangler.jsonc). On top of TanStack Start's default handler it adds the security
 * headers to every server-rendered response (`public/_headers` only covers static assets) and caches responses at the
 * edge according to their `CDN-Cache-Control` header (see `lib/edge-cache.ts`). The Cache API is inert on workers.dev
 * hosts (branch previews) and skipped in `vite dev`, so both always render fresh.
 */

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "interest-cohort=()",
}

const render = async (request: Request) => withHeaders(await handler.fetch(request), SECURITY_HEADERS)

const edgeCache = (): EdgeCache | undefined =>
  import.meta.env.DEV || typeof caches === "undefined" ? undefined : (caches as unknown as { default?: EdgeCache }).default

export default createServerEntry({
  // Workers call `fetch(request, env, ctx)`; `ctx.waitUntil` keeps cache writes alive after the response is sent.
  fetch: (request: Request, _env?: unknown, ctx?: ExecutionContext) =>
    fetchWithEdgeCache(request, render, { cache: edgeCache(), ctx }),
})
