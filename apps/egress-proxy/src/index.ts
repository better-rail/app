/**
 * index.ts — boots the relay. All the behaviour lives in relay.ts so the tests
 * can build a relay from a plain config object instead of the process env.
 */
import { createRelay, loadConfig } from "./relay"

const config = loadConfig(process.env)
if (config.upstreams.length === 0) {
  console.warn("egress-proxy: neither SIRI_URL nor RAIL_URL is set, every /fetch will be refused")
}

const server = Bun.serve({
  port: Number(process.env.PORT) || 3000,
  maxRequestBodySize: 1024 * 1024,
  fetch: createRelay(config),
})
console.info(`egress-proxy is listening on port ${server.port}, relaying to ${config.upstreams.map((u) => u.host).join(", ")}`)
