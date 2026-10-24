// Workers tests run inside workerd with the bindings from wrangler.jsonc (test/workers/**):
// a local D1, KV and the Durable Objects, and the real Worker entry behind `SELF`.
// @cloudflare/vitest-pool-workers 0.23 (vitest 4) is a Vite plugin, not a pool option.
import { readFileSync } from "node:fs"
import { defineConfig } from "vitest/config"
import { cloudflareTest } from "@cloudflare/vitest-pool-workers"

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      // The workerd binary bundled with this pool release supports dates up to
      // 2026-08-22; the deployed Worker keeps wrangler.jsonc's newer date.
      miniflare: {
        compatibilityDate: "2026-08-22",
        // Test-only variables: a throwaway APNs signing key (test/workers/fixtures), and the
        // operator / debug tokens the guarded routes expect.
        bindings: {
          APPLE_BUNDLE_ID: "co.il.better-rail.test",
          APPLE_TEAM_ID: "TEAMID1234",
          APPLE_KEY_ID: "KEYID12345",
          APPLE_KEY_CONTENT: readFileSync("./test/workers/fixtures/apns-test-key.pem", "utf8"),
          APN_ENV: "test",
          INGEST_TOKEN: "test-ingest-token",
          SIRI_DEBUG_TOKEN: "test-debug-token",
        },
      },
    }),
  ],
  test: {
    include: ["test/workers/**/*.test.ts"],
    testTimeout: 30_000,
  },
})
