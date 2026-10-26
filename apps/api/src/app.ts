/**
 * app.ts — the HTTP surface, on Elysia with the Cloudflare adapter.
 *
 * Every path, status code and payload is the Bun/Express server's: the mobile
 * app, the native widgets and the web app only ever needed the base URL.
 */
import { Elysia } from "elysia"
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker"

import { logNames, logger } from "./logs"
import { railApiRoutes } from "./routes/rail-api"
import { rideRoutes } from "./routes/rides"
import { faresRoutes } from "./routes/fares"
import { siriDebugRoutes } from "./routes/siri-debug"
import { internalRoutes } from "./routes/internal"
import { serviceStatusRoutes } from "./routes/service-status"
import { stationAlertsRoutes } from "./routes/station-alerts"
import { delayGuardsRoutes } from "./routes/delay-guards"

// Dynamic mode: Workers forbid code generation from strings (`new Function`), which
// Elysia's ahead-of-time route compilation relies on.
export const app = new Elysia({ adapter: CloudflareAdapter, aot: false })
  .onError(({ code, error, set }) => {
    if (code === "NOT_FOUND") {
      set.status = 404
      return "Not Found"
    }
    if (code === "PARSE") {
      set.status = 400
      return "Bad Request"
    }
    logger.error(logNames.server.unhandled, { error, code })
    set.status = 500
    return "Internal Server Error"
  })
  .get("/isAlive", () => "App is ready! 🚂")
  .group("/api/v1", (api) =>
    api
      .use(rideRoutes)
      .use(faresRoutes)
      .use(siriDebugRoutes)
      .use(internalRoutes)
      // Network health per line, station departures and station pages (read-only)
      .use(serviceStatusRoutes)
      // Push subscriptions: station alerts and Delay Notifications
      .use(stationAlertsRoutes)
      .use(delayGuardsRoutes)
      .use(railApiRoutes),
  )
