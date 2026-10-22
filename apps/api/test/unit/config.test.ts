import { afterEach, describe, expect, it } from "bun:test"
import { config, decodeSecret } from "../../src/config"

const PEM = "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEG\n-----END PRIVATE KEY-----"
const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64")

afterEach(() => {
  delete process.env.APPLE_KEY_CONTENT
  delete process.env.FIREBASE_ADMIN_AUTH
})

describe("decodeSecret", () => {
  it("returns a plain value untouched", () => {
    expect(decodeSecret(PEM, "-----BEGIN")).toBe(PEM)
    expect(decodeSecret('{"a":1}', "{")).toBe('{"a":1}')
  })

  it("decodes a base64 value that decodes to the expected text", () => {
    expect(decodeSecret(b64(PEM), "-----BEGIN")).toBe(PEM)
    expect(decodeSecret(b64(PEM) + "\n", "-----BEGIN")).toBe(PEM)
    expect(decodeSecret(b64('{"project_id":"x"}'), "{")).toBe('{"project_id":"x"}')
  })

  it("leaves a value alone when it is not base64 of the expected text", () => {
    expect(decodeSecret("not base64!", "{")).toBe("not base64!")
    expect(decodeSecret(b64("hello"), "{")).toBe(b64("hello"))
    expect(decodeSecret(undefined, "{")).toBe("")
  })
})

describe("key settings", () => {
  it("reads the APNs key as PEM, \\n-escaped PEM or base64", () => {
    process.env.APPLE_KEY_CONTENT = PEM
    expect(config.appleKeyContent).toBe(PEM)
    process.env.APPLE_KEY_CONTENT = PEM.replace(/\n/g, "\\n")
    expect(config.appleKeyContent).toBe(PEM)
    process.env.APPLE_KEY_CONTENT = b64(PEM)
    expect(config.appleKeyContent).toBe(PEM)
  })

  it("reads the Firebase service account as JSON or base64 JSON", () => {
    const json = JSON.stringify({ project_id: "better-rail", client_email: "x@y", private_key: PEM })
    process.env.FIREBASE_ADMIN_AUTH = json
    expect(config.firebaseAdminAuth.private_key).toBe(PEM)
    process.env.FIREBASE_ADMIN_AUTH = b64(json)
    expect(config.firebaseAdminAuth.project_id).toBe("better-rail")
    expect(config.firebaseAdminAuth.private_key).toBe(PEM)
    process.env.FIREBASE_ADMIN_AUTH = "garbage"
    expect(config.firebaseAdminAuth).toEqual({})
  })
})
