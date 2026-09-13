import { describe, expect, test } from "bun:test"
import { generateKeyPairSync, sign } from "node:crypto"

import type { ConductorConfig } from "./config"
import { DiscordApi, type DiscordRole } from "./discord"
import { createHandler } from "./interactions"
import { selectPrefix, stationPicker } from "./messages"
import { isFlairRole, OnboardingRoles, PlatformRequired } from "./roles"
import { stations } from "./stations"

const keys = generateKeyPairSync("ed25519")
const publicKey = keys.publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("hex")
const guildId = "874203166873370695"
const applicationId = "1548800000000000000"
const userId = "1548800000000000001"
const staffRole = "1548800000000000002"
const botRole = "1548800000000000003"
const iosRole = "1548800000000000004"
const androidRole = "1548800000000000005"
const hashalomRole = "1548800000000000006"
const hahaganaRole = "1548800000000000007"
const config: ConductorConfig = {
  applicationId,
  guildId,
  publicKey,
  botToken: "test-only",
  platformRoles: { ios: iosRole, android: androidRole },
  stationRoles: { "4600": hashalomRole, "4900": hahaganaRole },
}

class FakeDiscord extends DiscordApi {
  memberRoles = [staffRole]
  mutations: { method: string; path: string }[] = []
  responses: object[] = []
  failAssignment = false
  roleList: DiscordRole[] = [
    { id: staffRole, name: "developer", permissions: "8", position: 10, managed: false },
    { id: botRole, name: "The Conductor", permissions: "268435456", position: 9, managed: true },
    ...[
      [iosRole, "ios"],
      [androidRole, "android"],
      [hashalomRole, "hashalom"],
      [hahaganaRole, "hahagana"],
    ].map(([id, name]) => ({ id, name, permissions: "0", position: 1, managed: false })),
  ]

  constructor() {
    super("test-only")
  }
  override async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (path === `/guilds/${guildId}/roles`) return this.roleList as T
    if (path === `/guilds/${guildId}/members/${applicationId}`) return { roles: [botRole] } as T
    if (path === `/guilds/${guildId}/members/${userId}`) return { roles: [...this.memberRoles] } as T
    if (path.startsWith("/webhooks/")) {
      this.responses.push(body as object)
      return undefined as T
    }
    const role = path.split("/").at(-1)!
    if (method === "PUT" && this.failAssignment) throw new Error("Assignment failed")
    this.mutations.push({ method, path })
    if (method === "PUT") this.memberRoles.push(role)
    else if (method === "DELETE") this.memberRoles = this.memberRoles.filter((id) => id !== role)
    return undefined as T
  }
}

let sequence = 0n
function interaction(customId: string, values?: string[]) {
  return {
    id: String(1548800000000000100n + sequence++),
    application_id: applicationId,
    guild_id: guildId,
    type: 3,
    token: "test-interaction-token",
    member: { user: { id: userId } },
    data: { custom_id: customId, values },
  }
}

function signedRequest(payload: unknown, timestamp = String(Math.floor(Date.now() / 1000))) {
  const body = JSON.stringify(payload)
  const signature = sign(null, Buffer.from(timestamp + body), keys.privateKey).toString("hex")
  return new Request("http://localhost/discord/interactions", {
    method: "POST",
    body,
    headers: { "X-Signature-Timestamp": timestamp, "X-Signature-Ed25519": signature },
  })
}

async function waitForResponse(api: FakeDiscord, count = 1) {
  for (let attempt = 0; attempt < 100 && api.responses.length < count; attempt++) await Bun.sleep(1)
  expect(api.responses).toHaveLength(count)
  return api.responses[count - 1] as { content: string; components: unknown[] }
}

describe("conductor onboarding", () => {
  test("new flair roles at the bot's numeric position use Discord's ID tie-break", async () => {
    const api = new FakeDiscord()
    api.roleList.find((role) => role.id === botRole)!.position = 1
    const roles = new OnboardingRoles(config, api)
    await roles.choose(userId, { kind: "platform", id: "ios" })
    expect(api.memberRoles).toContain(iosRole)
    const bot = api.roleList.find((role) => role.id === botRole)!
    expect(isFlairRole({ ...bot, id: staffRole, name: "ios", managed: false, permissions: "0" }, "ios", [bot])).toBe(false)
    expect(isFlairRole({ ...bot, name: "ios", managed: false, permissions: "0" }, "ios", [bot])).toBe(false)
  })

  test("verifies signatures and rejects tampered or expired requests", async () => {
    const api = new FakeDiscord()
    const handler = createHandler(config, api)
    expect(await (await handler(signedRequest({ type: 1 }))).json()).toEqual({ type: 1 })
    const tampered = signedRequest(interaction("conductor:platform:ios"))
    expect((await handler(new Request(tampered.url, { method: "POST", body: "{}", headers: tampered.headers }))).status).toBe(401)
    const expired = signedRequest(interaction("conductor:platform:ios"), String(Math.floor(Date.now() / 1000) - 301))
    expect((await handler(expired)).status).toBe(401)
    expect(api.mutations).toHaveLength(0)
  })

  test("start asks for a required device with no skip button", async () => {
    const result = await (await createHandler(config, new FakeDiscord())(signedRequest(interaction("conductor:start")))).json()
    expect(result.data.flags).toBe(64)
    expect(result.data.components[0].components.map((button: { label: string }) => button.label)).toEqual(["iOS", "Android"])
    expect(JSON.stringify(result)).not.toContain("conductor:skip")
  })

  test("device selection advances to optional station selection; skipping completes", async () => {
    const api = new FakeDiscord()
    const handler = createHandler(config, api)
    expect(await (await handler(signedRequest(interaction("conductor:platform:ios")))).json()).toEqual({
      type: 5,
      data: { flags: 64 },
    })
    const stationStep = await waitForResponse(api)
    expect(stationStep.content).toContain("2 / 2")
    expect(JSON.stringify(stationStep.components)).toContain("נדלג בינתיים")
    await handler(signedRequest(interaction("conductor:skip")))
    const completed = await waitForResponse(api, 2)
    expect(completed.content).toContain("סגור, אפשר לנסוע")
    expect(api.memberRoles).toEqual([staffRole, iosRole])
  })

  test("station selection changes only station flair", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, hahaganaRole)
    const handler = createHandler(config, api)
    await handler(signedRequest(interaction(`${selectPrefix}0`, ["4600"])))
    expect((await waitForResponse(api)).content).toContain("**תחנה:** hashalom")
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole, hashalomRole]))
    await handler(signedRequest(interaction("conductor:clear")))
    await waitForResponse(api, 2)
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole]))
  })

  test("skip and station choice cannot bypass required device selection", async () => {
    const api = new FakeDiscord()
    const roles = new OnboardingRoles(config, api)
    await expect(roles.choose(userId, { kind: "skip" })).rejects.toBeInstanceOf(PlatformRequired)
    await expect(roles.choose(userId, { kind: "station", id: "4600" })).rejects.toBeInstanceOf(PlatformRequired)
    const handler = createHandler(config, api, roles)
    await handler(signedRequest(interaction("conductor:skip")))
    expect((await waitForResponse(api)).content).toContain("1 / 2")
    expect(api.mutations).toHaveLength(0)
  })

  test("switching device preserves station and staff roles; concurrent picks end with one device", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, hashalomRole)
    const roles = new OnboardingRoles(config, api)
    await Promise.all([
      roles.choose(userId, { kind: "platform", id: "android" }),
      roles.choose(userId, { kind: "platform", id: "ios" }),
    ])
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, hashalomRole, iosRole]))
  })

  test("failed assignment preserves the existing station", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, hahaganaRole)
    api.failAssignment = true
    await expect(new OnboardingRoles(config, api).choose(userId, { kind: "station", id: "4600" })).rejects.toThrow(
      "Assignment failed",
    )
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole, hahaganaRole]))
  })

  test("a station role with expanded permissions is never assignable", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole)
    api.roleList.find((r) => r.id === hashalomRole)!.permissions = "8"
    await expect(new OnboardingRoles(config, api).choose(userId, { kind: "station", id: "4600" })).rejects.toThrow(
      "That role is unavailable",
    )
    expect(api.mutations).toHaveLength(0)
  })

  test("signed replay does not assign a role twice, and another guild cannot assign roles", async () => {
    const api = new FakeDiscord()
    const handler = createHandler(config, api)
    const selection = interaction("conductor:platform:ios")
    await handler(signedRequest(selection))
    await handler(signedRequest(selection))
    await waitForResponse(api)
    expect(api.mutations).toHaveLength(1)
    await handler(signedRequest({ ...interaction("conductor:platform:android"), guild_id: "1548800000000000999" }))
    expect(api.mutations).toHaveLength(1)
  })

  test("all stations fit Discord component limits with unique lowercase names", () => {
    const menus = stationPicker("iOS").components.slice(0, -1)
    const optionCounts = menus.map((row) => (row.components[0] as { options: unknown[] }).options.length)
    expect(menus.length).toBeLessThanOrEqual(4)
    expect(optionCounts.every((count) => count <= 25)).toBe(true)
    expect(optionCounts.reduce((sum, count) => sum + count, 0)).toBe(stations.length)
    expect(stations.every((s) => /^[a-z0-9 ]+$/.test(s.name))).toBe(true)
    expect(new Set(stations.map((s) => s.name)).size).toBe(stations.length)
  })
})
