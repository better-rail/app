import * as Sentry from "@sentry/bun"

import { loadConfig } from "./config"
import { createHandler } from "./interactions"

// Reads SENTRY_DSN; must run before Bun.serve so handler crashes are captured.
Sentry.init()
const config = loadConfig()
if (!Object.keys(config.platformRoles).length) {
  console.warn("Conductor: onboarding roles have not been provisioned yet")
}
const server = Bun.serve({
  port: Number(process.env.PORT) || 3000,
  maxRequestBodySize: 64_000,
  fetch: createHandler(config),
})
console.info(`The Conductor is listening on port ${server.port}`)
