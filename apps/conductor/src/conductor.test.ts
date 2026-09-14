import { describe, expect, spyOn, test } from "bun:test"
import { generateKeyPairSync, sign } from "node:crypto"
import type { ConductorConfig } from "./config"
import { DiscordApi, type DiscordChannel, type DiscordRole } from "./discord"
import { createHandler } from "./interactions"
import { journeyComplete, platformPicker, startButton, welcomeMessage } from "./messages"
import { everyoneCanReadWelcome, requireCompleteChannelAudit } from "./permissions"
import { isFlairRole, OnboardingRoles } from "./roles"

const keys = generateKeyPairSync("ed25519")
const publicKey = keys.publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("hex")
const guildId = "874203166873370695"
const applicationId = "1548800000000000000"
const userId = "1548800000000000001"
const staffRole = "1548800000000000002"
const botRole = "1548800000000000003"
const iosRole = "1548800000000000004"
const androidRole = "1548800000000000005"
const unrelatedRole = "1548800000000000006"
const config: ConductorConfig = {
  applicationId,
  guildId,
  publicKey,
  botToken: "test-only",
  platformRoles: { ios: iosRole, android: androidRole },
}

class FakeDiscord extends DiscordApi {
  memberRoles = [staffRole]
  mutations: { method: string; path: string }[] = []
  responses: object[] = []
  failAssignment = false
  failAssignmentRole?: string
  failRemovalOnce?: string
  failAfterMutationOnce?: { method: string; roleId: string }
  channelList: DiscordChannel[] = [{ id: "1548800000000000020", type: 0, permission_overwrites: [] }]
  roleList: DiscordRole[] = [
    { id: staffRole, name: "developer", permissions: "8", position: 10, managed: false },
    { id: botRole, name: "The Conductor", permissions: "268435456", position: 9, managed: true },
    ...[
      [iosRole, "ios"],
      [androidRole, "android"],
      [unrelatedRole, "unrelated"],
    ].map(([id, name]) => ({ id, name, permissions: "0", position: 1, managed: false })),
  ]

  constructor() {
    super("test-only")
  }
  override async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (path === `/guilds/${guildId}/channels`) return this.channelList as T
    if (path === `/guilds/${guildId}/roles`) return this.roleList as T
    if (path === `/guilds/${guildId}/members/${applicationId}`) return { roles: [botRole] } as T
    if (path === `/guilds/${guildId}/members/${userId}`) return { roles: [...this.memberRoles] } as T
    if (path.startsWith("/webhooks/")) {
      this.responses.push(body as object)
      return undefined as T
    }
    const role = path.split("/").at(-1)!
    if (method === "PUT" && (this.failAssignment || this.failAssignmentRole === role)) throw new Error("Assignment failed")
    if (method === "DELETE" && this.failRemovalOnce === role) {
      this.failRemovalOnce = undefined
      throw new Error("Removal failed")
    }
    this.mutations.push({ method, path })
    if (method === "PUT" && !this.memberRoles.includes(role)) this.memberRoles.push(role)
    else if (method === "DELETE") this.memberRoles = this.memberRoles.filter((id) => id !== role)
    if (this.failAfterMutationOnce?.method === method && this.failAfterMutationOnce.roleId === role) {
      this.failAfterMutationOnce = undefined
      throw new Error("Response timed out after mutation")
    }
    return undefined as T
  }
}

let sequence = 0n
function interaction(customId: string, values?: string[], message?: { components: unknown[] }) {
  return {
    id: String(1548800000000000100n + sequence++),
    application_id: applicationId,
    guild_id: guildId,
    type: 3,
    token: "test-interaction-token",
    member: { user: { id: userId } },
    data: { custom_id: customId, values },
    message: { flags: 64, components: message?.components ?? [] },
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
    await roles.choose(userId, "ios")
    expect(api.memberRoles).toContain(iosRole)
    const bot = api.roleList.find((role) => role.id === botRole)!
    expect(
      isFlairRole({ ...bot, id: staffRole, name: "ios", managed: false, permissions: "0" }, "ios", [bot], api.channelList),
    ).toBe(false)
    expect(isFlairRole({ ...bot, name: "ios", managed: false, permissions: "0" }, "ios", [bot], api.channelList)).toBe(false)
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

  test("failed device removal restores the original device and leaves unrelated roles untouched", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, unrelatedRole)
    api.failRemovalOnce = iosRole
    await expect(new OnboardingRoles(config, api).choose(userId, "android")).rejects.toThrow("Removal failed")
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole, unrelatedRole]))
  })

  test("uncertain assignment and removal responses are compensated idempotently", async () => {
    for (const method of ["PUT", "DELETE"]) {
      const api = new FakeDiscord()
      api.memberRoles.push(iosRole, unrelatedRole)
      api.failAfterMutationOnce = { method, roleId: method === "PUT" ? androidRole : iosRole }
      await expect(new OnboardingRoles(config, api).choose(userId, "android")).rejects.toThrow("Response timed out")
      expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole, unrelatedRole]))
    }
  })

  test("channel overwrites make a cosmetic role ineligible at setup and runtime", async () => {
    for (const roleId of [iosRole, androidRole]) {
      for (const bitset of [
        { allow: "1024", deny: "0" },
        { allow: "0", deny: "2048" },
      ]) {
        const api = new FakeDiscord()
        api.memberRoles.push(unrelatedRole)
        api.channelList[0].permission_overwrites.push({ id: roleId, type: 0, ...bitset })
        const role = api.roleList.find((entry) => entry.id === roleId)!
        const bot = api.roleList.find((entry) => entry.id === botRole)!
        expect(isFlairRole(role, role.name, [bot], api.channelList)).toBe(false)
        await expect(new OnboardingRoles(config, api).choose(userId, roleId === iosRole ? "ios" : "android")).rejects.toThrow(
          "That role is unavailable",
        )
        expect(api.mutations).toHaveLength(0)
      }
    }
  })

  test("incomplete HTTP audits disable all role selections at the obfuscation cutoff", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole)
    const bot = api.roleList.find((entry) => entry.id === botRole)!
    const cutoff = Date.UTC(2026, 10, 16)
    expect(() => requireCompleteChannelAudit([bot], cutoff - 1)).not.toThrow()
    expect(() => requireCompleteChannelAudit([bot], cutoff)).toThrow("complete channel audit")
    const clock = spyOn(Date, "now").mockReturnValue(cutoff)
    try {
      const roles = new OnboardingRoles(config, api)
      for (const platformId of ["ios", "android"]) {
        await expect(roles.choose(userId, platformId)).rejects.toThrow("complete channel audit")
      }
      expect(api.mutations).toHaveLength(0)
      expect(api.memberRoles).toEqual([staffRole, iosRole])
      bot.permissions = "8"
      expect(() => requireCompleteChannelAudit([bot], cutoff)).not.toThrow()
      await roles.choose(userId, "android")
      expect(api.memberRoles).toContain(androidRole)
    } finally {
      clock.mockRestore()
    }
  })

  test("welcome access requires both visibility and history after everyone overwrites", () => {
    const everyone: DiscordRole = { id: guildId, name: "@everyone", permissions: "0", managed: false, position: 0 }
    const channel: DiscordChannel = { id: "1548800000000000020", type: 0, permission_overwrites: [] }
    expect(everyoneCanReadWelcome(channel, everyone)).toBe(false)
    everyone.permissions = "66560"
    expect(everyoneCanReadWelcome(channel, everyone)).toBe(true)
    channel.permission_overwrites.push({ id: guildId, type: 0, allow: "0", deny: "1024" })
    expect(everyoneCanReadWelcome(channel, everyone)).toBe(false)
    everyone.permissions = "0"
    channel.permission_overwrites[0] = { id: guildId, type: 0, allow: "66560", deny: "0" }
    expect(everyoneCanReadWelcome(channel, everyone)).toBe(true)
    channel.permission_overwrites[0].type = 1
    expect(everyoneCanReadWelcome(channel, everyone)).toBe(false)
    channel.permission_overwrites[0].type = 0
    everyone.permissions = "66560"
    channel.permission_overwrites[0] = { id: guildId, type: 0, allow: "0", deny: "65536" }
    expect(everyoneCanReadWelcome(channel, everyone)).toBe(false)
    channel.permission_overwrites = []
    everyone.permissions = "1024"
    expect(everyoneCanReadWelcome(channel, everyone)).toBe(false)
    everyone.permissions = "65536"
    expect(everyoneCanReadWelcome(channel, everyone)).toBe(false)
    everyone.permissions = "8"
    expect(everyoneCanReadWelcome(channel, everyone)).toBe(true)
  })

  test("switching device preserves unrelated roles; concurrent picks end with one device", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, unrelatedRole)
    const roles = new OnboardingRoles(config, api)
    await Promise.all([roles.choose(userId, "android"), roles.choose(userId, "ios")])
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, unrelatedRole, iosRole]))
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

  test("welcome starts a private device choice with no skip or station step", async () => {
    const api = new FakeDiscord()
    const handler = createHandler(config, api)
    const start = interaction(startButton)
    start.message.flags = 0
    const result = await (await handler(signedRequest(start))).json()
    expect(result.type).toBe(4)
    expect(result.data.flags).toBe(64)
    expect(result.data.content).toContain("אייפון או אנדרואיד")
    expect(result.data.components[0].components.map((button: { label: string }) => button.label)).toEqual(["אייפון", "אנדרואיד"])
    expect(api.mutations).toHaveLength(0)
  })

  test("either device immediately completes onboarding with the channel links", async () => {
    for (const [platformId, roleId] of [
      ["ios", iosRole],
      ["android", androidRole],
    ]) {
      const api = new FakeDiscord()
      const handler = createHandler(config, api)
      expect(await (await handler(signedRequest(interaction("conductor:platform:" + platformId)))).json()).toEqual({ type: 6 })
      expect(await waitForResponse(api)).toEqual(journeyComplete())
      expect(api.memberRoles).toEqual([staffRole, roleId])
      expect(journeyComplete().content).toContain("<#1548778686671757373>")
      expect(journeyComplete().content).toContain("<#1548778257866817626>")
    }
  })

  test("retired station controls and modals return to device choice without mutations", async () => {
    const api = new FakeDiscord()
    const handler = createHandler(config, api)
    for (const customId of [
      "conductor:skip",
      "conductor:clear",
      "conductor:finish:4600",
      "conductor:station:0",
      "conductor:search:",
      "conductor:result:",
      "conductor:remove:4600:4600",
    ]) {
      const response = await (await handler(signedRequest(interaction(customId)))).json()
      expect(response).toEqual({ type: 7, data: platformPicker() })
    }
    const modal = { ...interaction("conductor:query:4600"), type: 5 }
    expect(await (await handler(signedRequest(modal))).json()).toEqual({ type: 7, data: platformPicker() })
    const forged = { ...interaction("conductor:platform:ios"), type: 5 }
    expect(await (await handler(signedRequest(forged))).json()).toEqual({ type: 7, data: platformPicker() })
    expect(api.mutations).toHaveLength(0)
    expect(api.responses).toHaveLength(0)
  })

  test("an unavailable or privileged role cannot be assigned", async () => {
    for (const change of ["unknown", "renamed", "privileged", "managed", "above-bot"]) {
      const api = new FakeDiscord()
      const role = api.roleList.find((r) => r.id === iosRole)!
      if (change === "renamed") role.name = "staff"
      if (change === "privileged") role.permissions = "8"
      if (change === "managed") role.managed = true
      if (change === "above-bot") role.position = 11
      await expect(
        new OnboardingRoles(config, api).choose(userId, change === "unknown" ? "not-a-device" : "ios"),
      ).rejects.toThrow("That role is unavailable")
      expect(api.mutations).toHaveLength(0)
    }
  })

  test("a failed device update offers retry without showing completion", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole)
    api.failAssignmentRole = androidRole
    await createHandler(config, api)(signedRequest(interaction("conductor:platform:android")))
    const response = await waitForResponse(api)
    expect(response.content).toContain("נסו שוב")
    expect(response.components).toEqual(platformPicker().components)
    expect(api.memberRoles).toEqual([staffRole, iosRole])
  })

  test("incomplete compensation still attempts the remaining rollback", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, unrelatedRole)
    api.failAfterMutationOnce = { method: "DELETE", roleId: iosRole }
    api.failAssignmentRole = iosRole
    await expect(new OnboardingRoles(config, api).choose(userId, "android")).rejects.toThrow("rollback was incomplete")
    expect(api.memberRoles).not.toContain(androidRole)
    expect(api.memberRoles).toContain(staffRole)
    expect(api.memberRoles).toContain(unrelatedRole)
  })

  test("welcome describes one question and keeps the selected Hebrew greeting", () => {
    expect(welcomeMessage().content).toBe("## ברוכים הבאים לדיסקורד של בטר רייל!\n\nלפני שאתם מצטרפים, יש לנו שאלה קצרה")
    expect(welcomeMessage().components[0].components[0].custom_id).toBe(startButton)
  })
})
