// Types for `cloudflare:test` in the Workers tests: the bindings wrangler.jsonc declares.
import type { Env } from "../../src/runtime"

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}
