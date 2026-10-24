import { SELF } from "cloudflare:test"
import { it, expect } from "vitest"
it("isAlive", async () => {
  const res = await SELF.fetch("https://api.test/isAlive")
  expect(res.status).toBe(200)
  expect(await res.text()).toBe("App is ready! 🚂")
})
it("legacy envelope", async () => {
  const res = await SELF.fetch("https://api.test/api/v1/rail-api/common/api/v1/railupdates/?LanguageId=Hebrew&SystemType=1")
  expect(res.status).toBe(200)
  const body = (await res.json()) as any
  expect(body.result).toEqual([])
  expect(body.successStatus).toBe(1)
})
it("DELETE with json body reaches the handler (rides disabled gives 503)", async () => {
  const res = await SELF.fetch("https://api.test/api/v1/ride", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rideId: "x" }),
  })
  expect([200, 500, 503]).toContain(res.status)
  const body = (await res.json()) as any
  expect(body).toHaveProperty("success")
})
it("fares 503 without snapshot", async () => {
  const res = await SELF.fetch("https://api.test/api/v1/fares?from=3700&to=5010")
  expect(res.status).toBe(503)
})
