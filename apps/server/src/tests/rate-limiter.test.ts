import type { Request } from "express"
import { getRateLimitKey } from "../utils/rate-limiter"
import { partiallyMock } from "./helpers/types"

const request = (ip: string, body: Record<string, string>) =>
  partiallyMock<Request>({
    headers: { "cf-connecting-ip": ip },
    ip,
    body,
  })

describe("getRateLimitKey", () => {
  const deviceToken = (value: Request) => value.body.token

  it("keeps devices behind the same public IP in separate buckets", () => {
    const firstDevice = request("203.0.113.1", { token: "device-a" })
    const secondDevice = request("203.0.113.1", { token: "device-b" })

    expect(getRateLimitKey(firstDevice, deviceToken)).not.toBe(getRateLimitKey(secondDevice, deviceToken))
  })

  it("keeps requests from the same device in the same bucket", () => {
    const firstRequest = request("203.0.113.1", { token: "device-a" })
    const secondRequest = request("203.0.113.1", { token: "device-a" })

    expect(getRateLimitKey(firstRequest, deviceToken)).toBe(getRateLimitKey(secondRequest, deviceToken))
  })

  it("uses the IP-only bucket when no discriminator is provided", () => {
    expect(getRateLimitKey(request("203.0.113.1", {}))).toBe("203.0.113.1")
  })
})
