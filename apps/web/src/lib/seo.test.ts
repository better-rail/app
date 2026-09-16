import { describe, expect, test } from "bun:test"
import { absoluteUrl, originUrl, SITE_URL } from "./seo"

describe("originUrl", () => {
  test("falls back to the canonical origin while rendering on the server", () => {
    expect(originUrl("/routes/3700/680?trip=7717")).toBe(`${SITE_URL}/routes/3700/680?trip=7717`)
    expect(absoluteUrl("/routes/3700/680")).toBe(`${SITE_URL}/routes/3700/680`)
  })

  test("uses the origin the page is served from in the browser", () => {
    const globals = globalThis as { window?: { location: { origin: string } } }
    globals.window = { location: { origin: "https://web-app-better-rail-web.example.workers.dev" } }
    try {
      expect(originUrl("/routes/3700/680?trip=7717")).toBe(
        "https://web-app-better-rail-web.example.workers.dev/routes/3700/680?trip=7717",
      )
    } finally {
      delete globals.window
    }
  })
})
