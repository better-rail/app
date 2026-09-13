import { loadConfig } from "./config"
import { createHandler } from "./interactions"

const config = loadConfig()
if (Object.keys(config.stationRoles).length === 0) console.warn("Conductor: station roles have not been provisioned yet")
const server = Bun.serve({
  port: Number(process.env.PORT) || 3000,
  maxRequestBodySize: 64_000,
  fetch: createHandler(config),
})
console.info(`The Conductor is listening on port ${server.port}`)
