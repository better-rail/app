// The entry module exports only the handler: workerd rejects any other named export.
import * as Sentry from "@sentry/cloudflare"

import { limitRequestBody } from "./body-limit"
import { loadConfig } from "./config"
import { createHandler, type HandlerContext } from "./interactions"

/** The Worker's secrets (`wrangler secret put`, see README); every one is read through loadConfig. */
export type Env = {
  DISCORD_APPLICATION_ID?: string
  DISCORD_PUBLIC_KEY?: string
  DISCORD_BOT_TOKEN?: string
  DISCORD_GUILD_ID?: string
  DISCORD_PLATFORM_ROLES?: string
  RESEND_API_KEY?: string
  RESEND_WEBHOOK_SECRET?: string
  DISCORD_EMAIL_FEEDBACK_CHANNEL_ID?: string
  SENTRY_DSN?: string
}

// Discord webhook URLs carry the interaction token and Resend download URLs are signed, so breadcrumbs keep only the path.
const scrubUrl = (url: string) => url.split(/[?#]/)[0].replace(/(\/webhooks\/\d+\/)[^/]+/, "$1[Filtered]")

const sentryOptions = (env: Env): Sentry.CloudflareOptions => ({
  dsn: env.SENTRY_DSN,
  // Keep tracing off: spans would carry the URLs unscrubbed.
  tracesSampleRate: 0,
  beforeSend: (event) => {
    // The incoming request adds nothing the tags don't say, and its headers hold the signatures.
    delete event.request
    return event
  },
  beforeBreadcrumb: (breadcrumb) => {
    if (breadcrumb.data) {
      delete breadcrumb.data["http.query"]
      delete breadcrumb.data["http.fragment"]
      if (typeof breadcrumb.data.url === "string") breadcrumb.data.url = scrubUrl(breadcrumb.data.url)
    }
    return breadcrumb
  },
})

let handler: ReturnType<typeof createHandler> | undefined

// One handler per isolate: it owns the replay caches and the per-user role update queue, and the config is read once.
function conductor(env: Env) {
  if (!handler) {
    const config = loadConfig(env)
    if (!Object.keys(config.platformRoles).length) {
      console.warn("Conductor: onboarding roles have not been provisioned yet")
    }
    handler = createHandler(config)
  }
  return handler
}

export default Sentry.withSentry(sentryOptions, {
  async fetch(request: Request, env: Env, context: HandlerContext): Promise<Response> {
    const limited = await limitRequestBody(request)
    if (limited instanceof Response) return limited
    return conductor(env)(limited, context)
  },
})
