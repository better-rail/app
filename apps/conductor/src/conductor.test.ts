import { describe, expect, test } from "bun:test"
import { createHmac, generateKeyPairSync, sign } from "node:crypto"
import { limitRequestBody, MAX_REQUEST_BODY_BYTES } from "./body-limit"
import { guildCommands, registerCommands } from "./commands"
import { type ConductorConfig, loadConfig } from "./config"
import { DiscordApi, type DiscordChannel, type DiscordMessage, type DiscordOverwrite, type DiscordRole } from "./discord"
import {
  chunkEmailBody,
  cleanQuotedReply,
  detectTextDirection,
  EmailBridge,
  enforceRfcLineLength,
  extractSenderEmail,
  extractThreadId,
  formatEmailHtml,
  formatReplySubject,
  htmlToText,
} from "./email-bridge"
import worker from "./index"
import { createHandler } from "./interactions"
import { journeyComplete, platformPicker, welcomeMessage } from "./messages"
import { everyoneCanReadWelcome } from "./permissions"
import {
  ResendApi,
  type ResendReceivedAttachment,
  type ResendReceivedEmail,
  type ResendSendEmailOptions,
  verifyResendSignature,
} from "./resend"
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
  failAssignmentRole?: string
  failRemovalOnce?: string
  failAfterMutationOnce?: { method: string; roleId: string }
  roleList: DiscordRole[] = [
    { id: staffRole, name: "developer", permissions: "8", position: 10, managed: false },
    { id: botRole, name: "The Conductor", permissions: "268435456", position: 9, managed: true },
    ...[
      [iosRole, "ios"],
      [androidRole, "android"],
      [unrelatedRole, "unrelated"],
    ].map(([id, name]) => ({ id, name, permissions: "0", position: 1, managed: false })),
  ]

  channels = new Map<string, DiscordChannel>()
  messages = new Map<string, DiscordMessage[]>()
  threadCounter = 1000n
  uploads: Blob[] = []

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

    const threadMatch = path.match(/^\/channels\/(\d+)\/threads$/)
    if (method === "POST" && threadMatch) {
      const parentId = threadMatch[1]
      const threadId = String(1548800000000000000n + this.threadCounter++)
      const b = body as { name: string; type?: number; applied_tags?: string[]; message?: { content: string } }
      const channel: DiscordChannel = {
        id: threadId,
        guild_id: guildId,
        parent_id: parentId,
        name: b.name,
        type: b.type ?? 11,
        permission_overwrites: [],
        applied_tags: b.applied_tags,
      }
      this.channels.set(threadId, channel)
      if (b.message) {
        const author = { id: applicationId, username: "The Conductor", bot: true }
        this.messages.set(threadId, [{ id: threadId, channel_id: threadId, content: b.message.content, author }])
      }
      return channel as T
    }

    const channelMatch = path.match(/^\/channels\/(\d+)$/)
    if (channelMatch) {
      const channelId = channelMatch[1]
      if (method === "GET") {
        const ch = this.channels.get(channelId)
        if (!ch) throw new Error("Channel not found")
        return ch as T
      }
      if (method === "PATCH") {
        const ch = this.channels.get(channelId)
        if (!ch) throw new Error("Channel not found")
        if (body && typeof body === "object" && "archived" in body) {
          if (!ch.thread_metadata) ch.thread_metadata = {}
          ch.thread_metadata.archived = (body as { archived: boolean }).archived
        }
        Object.assign(ch, body)
        return ch as T
      }
    }

    const messagesMatch = path.match(/^\/channels\/(\d+)\/messages(?:\?(.*))?$/)
    if (messagesMatch) {
      const channelId = messagesMatch[1]
      if (method === "GET") {
        const query = new URLSearchParams(messagesMatch[2] || "")
        const before = query.get("before")
        const after = query.get("after")
        const limit = Number(query.get("limit") || 50)
        const list = this.messages.get(channelId) || []
        if (after) {
          return list.filter((m) => BigInt(m.id) > BigInt(after)).slice(0, limit) as T
        }
        let all = [...list].reverse()
        if (before) {
          const idx = all.findIndex((m) => m.id === before)
          if (idx !== -1) all = all.slice(idx + 1)
        }
        return all.slice(0, limit) as T
      }
      if (method === "POST") {
        let content = ""
        if (typeof FormData !== "undefined" && body instanceof FormData) {
          const payloadJson = body.get("payload_json")
          if (typeof payloadJson === "string") {
            content = JSON.parse(payloadJson).content || ""
          }
          const file = body.get("files[0]")
          if (file instanceof Blob) this.uploads.push(file)
        } else if (body && typeof body === "object" && "content" in body) {
          content = (body as { content: string }).content
        }
        const msg: DiscordMessage = {
          id: String(1548800000000000000n + this.threadCounter++),
          channel_id: channelId,
          content,
          author: { id: applicationId, username: "The Conductor", bot: true },
        }
        const list = this.messages.get(channelId) || []
        list.push(msg)
        this.messages.set(channelId, list)
        return msg as T
      }
    }

    const role = path.split("/").at(-1)!
    if (method === "PUT" && this.failAssignmentRole === role) throw new Error("Assignment failed")
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

  test("welcome access requires both visibility and history after everyone overwrites", () => {
    const overwrite = (allow: string, deny = "0", type = 0): DiscordOverwrite => ({ id: guildId, type, allow, deny })
    const cases: [string, DiscordOverwrite[], boolean][] = [
      ["1024", [], false],
      ["65536", [], false],
      ["66560", [], true],
      ["8", [], true],
      ["66560", [overwrite("0", "1024")], false],
      ["66560", [overwrite("0", "65536")], false],
      ["0", [overwrite("66560")], true],
      ["0", [overwrite("66560", "0", 1)], false],
    ]
    for (const [permissions, permission_overwrites, expected] of cases) {
      const everyone: DiscordRole = { id: guildId, name: "@everyone", permissions, managed: false, position: 0 }
      expect(everyoneCanReadWelcome({ id: "1548800000000000020", type: 0, permission_overwrites }, everyone)).toBe(expected)
    }
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

  test("the retired Continue button still opens a private device choice", async () => {
    const api = new FakeDiscord()
    const handler = createHandler(config, api)
    const start = interaction("conductor:start")
    start.message.flags = 0
    expect(await (await handler(signedRequest(start))).json()).toEqual({ type: 4, data: { ...platformPicker(), flags: 64 } })
    expect(api.mutations).toHaveLength(0)
  })

  test("either device completes onboarding privately, from the welcome or a private picker", async () => {
    for (const button of welcomeMessage().components[0].components) {
      for (const flags of [0, 64]) {
        const api = new FakeDiscord()
        const selected = interaction(button.custom_id)
        selected.message.flags = flags
        const response = await (await createHandler(config, api)(signedRequest(selected))).json()
        expect(response).toEqual(flags ? { type: 6 } : { type: 5, data: { flags: 64 } })
        expect(await waitForResponse(api)).toEqual(journeyComplete())
        expect(api.memberRoles).toEqual([staffRole, button.custom_id.endsWith("ios") ? iosRole : androidRole])
      }
    }
  })

  test("retired station controls and modals return to device choice without mutations", async () => {
    const api = new FakeDiscord()
    const handler = createHandler(config, api)
    const retired = ["conductor:skip", "conductor:finish:4600", "conductor:station:0", "conductor:remove:4600:4600"]
    const modals = ["conductor:query:4600", "conductor:platform:ios"].map((id) => ({ ...interaction(id), type: 5 }))
    for (const payload of [...retired.map((id) => interaction(id)), ...modals]) {
      expect(await (await handler(signedRequest(payload))).json()).toEqual({ type: 7, data: platformPicker() })
    }
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
})

describe("conductor worker", () => {
  const env = {
    DISCORD_APPLICATION_ID: applicationId,
    DISCORD_PUBLIC_KEY: publicKey,
    DISCORD_BOT_TOKEN: "test-only",
    DISCORD_GUILD_ID: guildId,
    DISCORD_PLATFORM_ROLES: JSON.stringify(config.platformRoles),
  }
  const context = { waitUntil: (work: Promise<unknown>) => void work, passThroughOnException: () => {}, props: {} }

  test("the hourly cron registers /reply and /resolve on the guild", async () => {
    const discord = new FakeDiscord()
    await registerCommands(config, discord)
    expect(discord.mutations).toEqual([{ method: "PUT", path: `/applications/${applicationId}/guilds/${guildId}/commands` }])
    expect(guildCommands.map((command) => command.name)).toEqual(["reply", "resolve"])
  })

  test("loadConfig reads the Worker env and rejects incomplete settings", () => {
    expect(loadConfig({ ...env, RESEND_API_KEY: "re_key" })).toEqual({ ...config, resendApiKey: "re_key" })
    expect(() => loadConfig({ ...env, DISCORD_GUILD_ID: "guild" })).toThrow("application and guild IDs")
    expect(() => loadConfig({ ...env, DISCORD_PUBLIC_KEY: publicKey.slice(1) })).toThrow("public key")
    expect(() => loadConfig({ ...env, DISCORD_BOT_TOKEN: "" })).toThrow("DISCORD_BOT_TOKEN")
    expect(loadConfig({ ...env, DISCORD_PLATFORM_ROLES: undefined }).platformRoles).toEqual({})
  })

  test("signatures verify through the Worker entry, which caps request bodies at 64 KB", async () => {
    const health = await worker.fetch!(new Request("http://localhost/health"), env, context)
    expect(await health.json()).toEqual({ ok: true, name: "The Conductor" })
    expect(await (await worker.fetch!(signedRequest({ type: 1 }), env, context)).json()).toEqual({ type: 1 })
    expect((await worker.fetch!(signedRequest({ type: 1 }, "0"), env, context)).status).toBe(401)

    const oversized = signedRequest({ type: 1, padding: "x".repeat(MAX_REQUEST_BODY_BYTES) })
    expect((await worker.fetch!(oversized, env, context)).status).toBe(413)
    const declared = new Request("http://localhost/discord/interactions", {
      method: "POST",
      body: "{}",
      headers: { "content-length": String(MAX_REQUEST_BODY_BYTES + 1) },
    })
    expect(((await limitRequestBody(declared)) as Response).status).toBe(413)
    // A streamed body with no declared length is cut off at the limit
    const chunks = Array.from({ length: 8 }, () => new Uint8Array(10_000))
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks.shift()
        if (chunk) controller.enqueue(chunk)
        else controller.close()
      },
    })
    const streamed = new Request("http://localhost/discord/interactions", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit)
    expect(((await limitRequestBody(streamed)) as Response).status).toBe(413)
    const passed = await limitRequestBody(new Request("http://localhost/discord/interactions", { method: "POST", body: "{}" }))
    expect(passed).toBeInstanceOf(Request)
    expect(await (passed as Request).text()).toBe("{}")
  })
})

const feedbackChannelId = "1548785837758615692"
const testWebhookSecret = ["whsec", Buffer.from("mock-webhook-secret-bytes-32-len!").toString("base64")].join("_")
const emailConfig: ConductorConfig = {
  ...config,
  resendApiKey: "test-resend-key",
  resendWebhookSecret: testWebhookSecret,
  emailFeedbackChannelId: feedbackChannelId,
}

class FakeResend extends ResendApi {
  receivedEmails = new Map<string, ResendReceivedEmail>()
  receivedAttachments = new Map<string, ResendReceivedAttachment[]>()
  sentEmails: ResendSendEmailOptions[] = []

  constructor() {
    super("test-resend-key")
  }

  override async getReceivedEmail(emailId: string): Promise<ResendReceivedEmail> {
    const email = this.receivedEmails.get(emailId)
    if (!email) throw new Error(`Email ${emailId} not found`)
    return email
  }

  override async listReceivedEmailAttachments(emailId: string): Promise<ResendReceivedAttachment[]> {
    return this.receivedAttachments.get(emailId) || []
  }

  override async sendEmail(options: ResendSendEmailOptions): Promise<{ id: string }> {
    this.sentEmails.push(options)
    return { id: "re_test_sent_1" }
  }
}

function signedResendRequest(payload: unknown, secret: string, timestamp = String(Math.floor(Date.now() / 1000))) {
  const body = Buffer.from(JSON.stringify(payload))
  const key = secret.startsWith("whsec_") ? Buffer.from(secret.slice(6), "base64") : Buffer.from(secret, "utf-8")
  const svixId = "msg_test_123"
  const toSign = Buffer.concat([Buffer.from(`${svixId}.${timestamp}.`), body])
  const signature = createHmac("sha256", key).update(toSign).digest("base64")
  return new Request("http://localhost/resend/webhook", {
    method: "POST",
    body,
    headers: {
      "svix-id": svixId,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`,
      "Content-Type": "application/json",
    },
  })
}

const statusTagIds = { open: "1548800000000002001", replied: "1548800000000002002", resolved: "1548800000000002003" }

function createEmailBridge(cfg = emailConfig, feedbackType = 0) {
  const discord = new FakeDiscord()
  discord.channels.set(feedbackChannelId, {
    id: feedbackChannelId,
    guild_id: guildId,
    name: "email-feedback",
    type: feedbackType,
    permission_overwrites: [],
    available_tags: [
      { id: "1548800000000002000", name: "Bug" },
      { id: statusTagIds.open, name: "Open" },
      { id: statusTagIds.replied, name: "replied" },
      { id: statusTagIds.resolved, name: "Resolved" },
    ],
  })
  const resend = new FakeResend()
  const bridge = new EmailBridge(cfg, discord, resend)
  const handler = createHandler(cfg, discord, new OnboardingRoles(cfg, discord), resend, bridge)
  return { discord, resend, bridge, handler }
}

function replyCommand(channelId: string, message: string, id = "cmd_reply", permissions = "8192") {
  return {
    id,
    application_id: applicationId,
    guild_id: guildId,
    channel_id: channelId,
    type: 2,
    token: "tok",
    member: { user: { id: userId, username: "danny" }, permissions },
    data: { name: "reply", options: [{ name: "message", value: message }] },
  }
}

describe("resend email bridge", () => {
  test("verifyResendSignature validates signatures and rejects tampered or expired requests", async () => {
    const payload = { test: true }
    const valid = signedResendRequest(payload, testWebhookSecret)
    const validBody = Buffer.from(JSON.stringify(payload))
    expect(await verifyResendSignature(valid, validBody, testWebhookSecret)).toBe(true)

    const tamperedBody = Buffer.from(JSON.stringify({ test: false }))
    expect(await verifyResendSignature(valid, tamperedBody, testWebhookSecret)).toBe(false)

    const expired = signedResendRequest(payload, testWebhookSecret, String(Math.floor(Date.now() / 1000) - 400))
    expect(await verifyResendSignature(expired, validBody, testWebhookSecret)).toBe(false)

    const wrongSecret = ["whsec", Buffer.from("wrong-webhook-secret-bytes-32-len!").toString("base64")].join("_")
    expect(await verifyResendSignature(valid, validBody, wrongSecret)).toBe(false)
    const malformed = new Request(valid, { headers: { ...Object.fromEntries(valid.headers), "svix-signature": "v1,%%%" } })
    expect(await verifyResendSignature(malformed, validBody, testWebhookSecret)).toBe(false)
  })

  test("email parsing and formatting helpers", () => {
    const threadId = "1548800000000001001"
    expect(extractThreadId(`Re: Bug [#${threadId}]`)).toBe(threadId)
    expect(extractThreadId("No thread ID")).toBeUndefined()
    expect(extractThreadId(undefined, { "in-reply-to": `<thread-${threadId}@better-rail.co.il>` })).toBe(threadId)
    expect(extractThreadId(undefined, { references: `some-id <thread-${threadId}@better-rail.co.il>` })).toBe(threadId)
    expect(extractThreadId(undefined, undefined, [`feedback+${threadId}@better-rail.co.il`])).toBe(threadId)
    expect(extractThreadId(undefined, undefined, undefined, `Support • Ref: [#${threadId}]`)).toBe(threadId)

    expect(extractSenderEmail("David Cohen <david@example.com>")).toBe("david@example.com")
    expect(extractSenderEmail("david@example.com")).toBe("david@example.com")

    expect(formatReplySubject("Train 402 [2]")).toBe("Re: Train 402 [2]")
    expect(formatReplySubject("Bug [#1548800000000001001]")).toBe("Re: Bug")
    expect(formatReplySubject("Re: Train delay")).toBe("Re: Train delay")
    expect(formatReplySubject("")).toBe("Re: Email Feedback")

    expect(detectTextDirection("Train to תל אביב is on time")).toEqual({ dir: "ltr", align: "left", lang: "en" })
    expect(detectTextDirection("רכבת ל-Savidor יוצאת כעת")).toEqual({ dir: "rtl", align: "right", lang: "he" })
    expect(detectTextDirection("مرحبا بكم")).toEqual({ dir: "rtl", align: "right", lang: "ar" })
    expect(formatEmailHtml("שלום", threadId)).toContain('dir="rtl"')
    expect(formatEmailHtml("<script>alert('xss')</script>", threadId)).toContain("&lt;script&gt;")
    expect(formatEmailHtml("", threadId)).toContain("(Empty message)")

    const longUrl = "https://better-rail.co.il/" + "x".repeat(750)
    expect(formatEmailHtml(longUrl, threadId)).toContain(`${longUrl}</p>`)
    expect(formatEmailHtml("It costs $$5 and $& and $' end", threadId)).toContain("It costs $$5 and $&amp; and $' end</p>")

    expect(formatEmailHtml("A\r\n\r\nB\r\nC", threadId)).toContain("A</p>")
    expect(formatEmailHtml("A\r\n\r\nB\r\nC", threadId)).toContain("B<br />\r\nC</p>")

    expect(formatEmailHtml("Use {{threadId}} literally", threadId)).toContain("Use {{threadId}} literally")

    for (const sample of ["Word ".repeat(300), "שלום ".repeat(300), "https://x.co/" + "&".repeat(1200), "😀".repeat(1200)]) {
      for (const line of formatEmailHtml(sample, threadId).split("\r\n")) {
        expect(Buffer.byteLength(line)).toBeLessThanOrEqual(998)
      }
    }
    for (const line of enforceRfcLineLength("< " + "word ".repeat(300)).split("\r\n")) {
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(998)
    }

    const unbreakable = "https://x.co/" + "a".repeat(1200)
    expect(enforceRfcLineLength(`See ${unbreakable} now`)).toBe(`See\r\n${unbreakable}\r\nnow`)

    expect(
      cleanQuotedReply(
        `סבבה\n\nOn Wed, 30 Sept 2026, Better Rail wrote:\n\n> אנחנו נסדר את זה.\n>\n> --------------\n> Better Rail Support • Ref: [#${threadId}]\n>`,
      ),
    ).toBe("סבבה\n\nOn Wed, 30 Sept 2026, Better Rail wrote:\n\n> אנחנו נסדר את זה.")
    expect(cleanQuotedReply(`Thanks\n\n> > Earlier\n> >\n> > Better Rail Support • Ref: [#${threadId}]`)).toBe(
      "Thanks\n\n> > Earlier",
    )
    expect(cleanQuotedReply(`Thanks\n\n> We fixed it.\n>\n> --------------\n> Ref: [#${threadId}]`)).toBe(
      "Thanks\n\n> We fixed it.",
    )
    expect(cleanQuotedReply("> Better Rail Support is great")).toBe("> Better Rail Support is great")

    expect(htmlToText("<p>Hello <b>team</b>,</p><p>Great!<br/>Thanks.</p>")).toContain("Hello team,\n\nGreat!\nThanks.")

    expect(chunkEmailBody("Line of text.\n".repeat(180)).chunks.length).toBeGreaterThan(1)
    const large = chunkEmailBody("A".repeat(5000))
    expect(large.chunks[0]).toContain("exceeds 4,000 characters")
    expect(large.overflowFile?.filename).toBe("email_body.txt")
  })

  test("inbound email routes new threads, unarchives follow-ups, and prevents sender hijacking", async () => {
    const { discord, bridge } = createEmailBridge()
    const initial = await bridge.handleInboundEmail({
      id: "email_1",
      from: "Ron <ron@example.com>",
      to: ["feedback@better-rail.co.il"],
      subject: "Train schedule issue at Savidor",
      text: "Train 402 was delayed by 20 minutes today.",
      message_id: "<msg-ron-1@example.com>",
    })
    expect(initial.created).toBe(true)
    const threadId = initial.threadId
    expect(discord.channels.get(threadId)?.parent_id).toBe(feedbackChannelId)
    // Text-channel threads have no tags, so they get no status
    expect(discord.channels.get(threadId)?.applied_tags).toBeUndefined()
    expect(discord.messages.get(threadId)?.[0].content).toContain("Train schedule issue at Savidor")
    expect(discord.messages.get(threadId)?.[0].content).toContain("**Message-ID:** `<msg-ron-1@example.com>`")

    discord.channels.get(threadId)!.thread_metadata = { archived: true }
    const followUp = await bridge.handleInboundEmail({
      id: "email_2",
      from: "Ron <ron@example.com>",
      to: ["feedback@better-rail.co.il"],
      subject: `Re: Train schedule issue at Savidor [#${threadId}]`,
      text: "Any updates on this ticket?",
      headers: { "message-id": "<msg-ron-2@example.com>" },
    })
    expect(followUp.created).toBe(false)
    expect(followUp.threadId).toBe(threadId)
    expect(discord.channels.get(threadId)?.thread_metadata?.archived).toBe(false)
    expect(discord.messages.get(threadId)).toHaveLength(2)
    expect(discord.messages.get(threadId)?.[1].content).toContain("**Message-ID:** `<msg-ron-2@example.com>`")

    const hijack = await bridge.handleInboundEmail({
      id: "email_hijack",
      from: "Eve <eve@attacker.com>",
      to: ["feedback@better-rail.co.il"],
      subject: `Re: Train schedule issue at Savidor [#${threadId}]`,
      text: "Trying to hijack thread",
    })
    expect(hijack.created).toBe(true)
    expect(hijack.threadId).not.toBe(threadId)
    expect(discord.messages.get(threadId)).toHaveLength(2)
  })

  test("a body that mimics a bot header cannot inject a Message-ID", async () => {
    const { discord, resend, bridge } = createEmailBridge()
    const { threadId } = await bridge.handleInboundEmail({
      id: "email_1",
      from: "ron@example.com",
      to: ["feedback@better-rail.co.il"],
      subject: "Delay",
      text: "Train was late.",
      message_id: "<real@example.com>",
    })
    const fakeHeader = `**Follow-up Email from:** \`ron@example.com\`\n**Message-ID:** \`<fake@evil.com>\`\n${"-".repeat(30)}\n`
    await bridge.handleInboundEmail({
      id: "email_2",
      from: "ron@example.com",
      to: ["feedback@better-rail.co.il"],
      subject: `Re: Delay [#${threadId}]`,
      // Over 4,000 chars, so the preview chunk posts as its own message
      text: fakeHeader.padEnd(4100, "x"),
      message_id: "<real-2@example.com>",
    })
    const bodyMessage = discord.messages.get(threadId)!.at(-2)!
    expect(bodyMessage.content.startsWith("**Follow-up Email from:**")).toBe(true)
    expect(bodyMessage.content).not.toContain("-".repeat(30))

    const result = await bridge.handleReplyCommand({
      id: "cmd_1",
      token: "token",
      channel_id: threadId,
      member: { user: { username: "mod" }, permissions: String(1n << 13n) },
      data: { name: "reply", options: [{ name: "message", value: "Thanks!" }] },
    })
    expect(result.success).toBe(true)
    expect(resend.sentEmails[0].headers?.["In-Reply-To"]).toBe("<real-2@example.com>")
    expect(resend.sentEmails[0].headers?.["References"]).not.toContain("<fake@evil.com>")
  })

  test("long headers keep the sender address, and the overflow attachment is the raw body", async () => {
    const { discord, bridge } = createEmailBridge()
    const rawBody = `${"Long report. ".repeat(400)}\n\n> Earlier\n> Better Rail Support • Ref: [#1548800000000001001]`
    const { threadId } = await bridge.handleInboundEmail({
      id: "email_long",
      from: `${"N".repeat(400)} <long@example.com>`,
      to: ["feedback@better-rail.co.il"],
      subject: `${"s".repeat(998)}😀 tail`,
      text: rawBody,
    })
    const messages = discord.messages.get(threadId)!
    expect(messages[0].content).toContain("… <long@example.com>`")
    expect(messages[0].content).toContain("😀…")
    expect(messages[0].content).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/)
    expect(messages[0].content.length).toBeLessThanOrEqual(2000)
    expect(messages.at(-1)!.content).toContain("unedited")
    expect(await discord.uploads.at(-1)!.text()).toBe(rawBody)
  })

  test("inbound email downloads valid attachments and rejects oversized ones", async () => {
    const { discord, resend, bridge } = createEmailBridge()
    const huge = 30 * 1024 * 1024
    const attachments = [
      { id: "1", filename: "invoice.pdf", content_type: "application/pdf", size: 1024 },
      { id: "2", filename: "huge.zip", content_type: "application/zip", size: huge },
    ]
    resend.receivedAttachments.set(
      "email_att",
      attachments.map((a) => ({ ...a, download_url: `https://files.resend.com/${a.filename}` })),
    )
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) =>
      String(input).includes("huge.zip")
        ? new Response("huge", { headers: { "content-length": String(huge) } })
        : new Response(new Uint8Array([1, 2, 3, 4]))) as typeof fetch
    try {
      const { threadId } = await bridge.handleInboundEmail({
        id: "email_att",
        from: "attachment_user@example.com",
        to: ["feedback@better-rail.co.il"],
        subject: "With Attachments",
        text: "See attached invoice",
        attachments,
      })
      const messages = discord.messages.get(threadId)!
      expect(messages).toHaveLength(2)
      expect(messages[1].content).toContain("**Attachment:** `invoice.pdf`")
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test("POST /resend/webhook processes incoming email and rejects unauthorized requests", async () => {
    const empty = () => new Request("http://localhost/resend/webhook", { method: "POST", body: "{}" })
    for (const missing of [{ resendWebhookSecret: undefined }, { resendApiKey: undefined }]) {
      expect((await createEmailBridge({ ...emailConfig, ...missing }).handler(empty())).status).toBe(503)
    }

    const { discord, resend, handler } = createEmailBridge()
    expect((await handler(signedResendRequest({}, "wrong-secret"))).status).toBe(401)

    resend.receivedEmails.set("msg_999", {
      id: "msg_999",
      from: "Noa <noa@example.com>",
      to: ["feedback@better-rail.co.il"],
      subject: "Dark mode request",
      text: "Please add an OLED dark mode!",
    })
    const payload = { type: "email.received", data: { email_id: "msg_999" } }
    const response = await handler(signedResendRequest(payload, testWebhookSecret))
    expect(await response.json()).toEqual({ ok: true })
    expect((await handler(signedResendRequest(payload, testWebhookSecret))).status).toBe(200)

    const findThread = () => [...discord.channels.values()].find((c) => c.name === "Dark mode request")
    for (let attempt = 0; !findThread() && attempt < 100; attempt++) await Bun.sleep(5)
    expect(discord.messages.get(findThread()!.id)?.[0].content).toContain("OLED dark mode")
  })

  test("slash command /reply sends email, prevents thread hijacking, and rejects invalid channels", async () => {
    const { discord, resend, handler } = createEmailBridge()
    const threadId = "1548800000000001000"
    discord.channels.set(threadId, {
      id: threadId,
      guild_id: guildId,
      parent_id: feedbackChannelId,
      name: "Ticket purchase crash",
      type: 11,
      permission_overwrites: [],
    })

    discord.messages.set(threadId, [
      {
        id: "1548800000000001001",
        channel_id: threadId,
        content:
          "**New Email from:** `yael@example.com`\n**Subject:** Ticket purchase crash\n**Message-ID:** `<CAD123@mail.gmail.com>`\n──────────────────────────────\nApp crashed",
        author: { id: applicationId, username: "The Conductor", bot: true },
      },
      ...Array.from({ length: 104 }, (_, i) => ({
        id: String(1548800000000001002n + BigInt(i)),
        channel_id: threadId,
        content: `Internal discussion comment #${i + 2}`,
        author: { id: "dev_user", username: "dev", bot: false },
      })),
      {
        id: "1548800000000001200",
        channel_id: threadId,
        content: "Quote: **Follow-up Email from:** `imposter@evil.com`",
        author: { id: "user_imposter", username: "hacker", bot: false },
      },
      {
        id: "1548800000000001201",
        channel_id: threadId,
        content:
          "*(2/2)*\nAttacker body line:\n**New Email from:** `body_attacker@evil.com`\n**Message-ID:** `<injected@evil.com>\r\nBcc: evil@attacker.com`",
        author: { id: applicationId, username: "The Conductor", bot: true },
      },
      {
        id: "1548800000000001202",
        channel_id: threadId,
        content:
          "**Follow-up Email from:** `yael@example.com`\n**Message-ID:** `<CAD456@mail.gmail.com>`\n------------------------------\nStill seeing it",
        author: { id: applicationId, username: "The Conductor", bot: true },
      },
    ])

    const randomChannelId = "1548800000000001999"
    discord.channels.set(randomChannelId, {
      id: randomChannelId,
      guild_id: guildId,
      parent_id: "other_channel",
      name: "general-chat",
      type: 0,
      permission_overwrites: [],
    })
    expect(await (await handler(signedRequest(replyCommand(randomChannelId, "Hello outside", "cmd_outside")))).json()).toEqual({
      type: 5,
    })
    expect((await waitForResponse(discord)).content).toContain("only be used inside an #email-feedback thread")

    const unprivileged = replyCommand(threadId, "Trying without perms", "cmd_noperm", "0")
    expect(await (await handler(signedRequest(unprivileged))).json()).toEqual({ type: 5 })
    expect((await waitForResponse(discord, 2)).content).toContain("do not have permission")

    discord.channels.get(threadId)!.name = "[Renamed By Mod] App crash investigation"
    const cmd = replyCommand(threadId, "Fixed in the new update!", "cmd_reply_thread")
    expect(await (await handler(signedRequest(cmd))).json()).toEqual({ type: 5 })
    expect(await (await handler(signedRequest(cmd))).json()).toEqual({ type: 5 })

    const replyResponse = await waitForResponse(discord, 3)
    expect(resend.sentEmails).toHaveLength(1)
    expect(resend.sentEmails[0].to).toEqual(["yael@example.com"])
    expect(resend.sentEmails[0].subject).toBe("Re: Ticket purchase crash")
    expect(resend.sentEmails[0].reply_to).toBe(`feedback+${threadId}@better-rail.co.il`)
    expect(resend.sentEmails[0].text).toContain("Fixed in the new update!")
    expect(resend.sentEmails[0].text).toEndWith(`\r\n--------------\r\nRef: [#${threadId}]`)
    expect(resend.sentEmails[0].headers?.["In-Reply-To"]).toBe("<CAD456@mail.gmail.com>")
    expect(resend.sentEmails[0].headers?.["References"]).toContain("<CAD123@mail.gmail.com>")
    expect(resend.sentEmails[0].headers?.["References"]).toContain("<CAD456@mail.gmail.com>")
    expect(resend.sentEmails[0].headers?.["References"]).not.toContain("<injected@evil.com>")
    expect(resend.sentEmails[0].headers?.["References"]).toContain(`<thread-${threadId}@better-rail.co.il>`)
    expect(replyResponse.content).toContain("yael@example.com")

    const longCmd = replyCommand(threadId, "line\n".repeat(600), "cmd_reply_long")
    await handler(signedRequest(longCmd))
    const longResponse = await waitForResponse(discord, 4)
    expect(longResponse.content.length).toBeLessThanOrEqual(2000)
    expect(longResponse.content).toContain("...")
  })

  test("forum posts track Open, Replied and Resolved through the email flow", async () => {
    const { discord, resend, handler, bridge } = createEmailBridge(emailConfig, 15)
    const { threadId } = await bridge.handleInboundEmail({
      id: "email_forum",
      from: "Noa <noa@example.com>",
      to: ["feedback@better-rail.co.il"],
      subject: "Widget is blank",
      text: "The widget shows nothing.",
      message_id: "<noa-1@example.com>",
    })
    const thread = discord.channels.get(threadId)!
    expect(thread.applied_tags).toEqual([statusTagIds.open])
    // The starter message is part of the post, so the thread holds just the one message
    expect(discord.messages.get(threadId)).toHaveLength(1)
    expect(discord.messages.get(threadId)![0].id).toBe(threadId)

    thread.applied_tags = [statusTagIds.open, "1548800000000002000"]
    await handler(signedRequest(replyCommand(threadId, "Fixed in 3.2", "cmd_forum_reply")))
    expect((await waitForResponse(discord)).content).toContain("noa@example.com")
    expect(resend.sentEmails[0].headers?.["In-Reply-To"]).toBe("<noa-1@example.com>")
    expect(thread.applied_tags).toEqual([statusTagIds.replied, "1548800000000002000"])

    const resolve = { ...replyCommand(threadId, "", "cmd_forum_resolve"), data: { name: "resolve" } }
    expect(await (await handler(signedRequest(resolve))).json()).toEqual({ type: 5 })
    expect((await waitForResponse(discord, 2)).content).toContain("Resolved")
    for (let attempt = 0; !thread.thread_metadata?.archived && attempt < 100; attempt++) await Bun.sleep(5)
    expect(thread.applied_tags).toEqual([statusTagIds.resolved, "1548800000000002000"])
    expect(thread.thread_metadata?.archived).toBe(true)

    await bridge.handleInboundEmail({
      id: "email_forum_2",
      from: "noa@example.com",
      to: ["feedback@better-rail.co.il"],
      subject: `Re: Widget is blank [#${threadId}]`,
      text: "It's back.",
    })
    expect(thread.thread_metadata?.archived).toBe(false)
    expect(thread.applied_tags).toEqual([statusTagIds.open, "1548800000000002000"])
  })

  test("/resolve reports a status it could not set, or a missing permission, without archiving", async () => {
    const { discord, handler, bridge } = createEmailBridge(emailConfig, 15)
    const { threadId } = await bridge.handleInboundEmail({
      id: "email_full",
      from: "lior@example.com",
      to: ["feedback@better-rail.co.il"],
      subject: "Tags",
      text: "Hi",
    })
    const thread = discord.channels.get(threadId)!
    const resolve = (id: string, permissions?: string) => ({
      ...replyCommand(threadId, "", id, permissions),
      data: { name: "resolve" },
    })

    const fullTags = [statusTagIds.open, ...Array.from({ length: 5 }, (_, i) => `154880000000000300${i}`)]
    thread.applied_tags = [...fullTags]
    await handler(signedRequest(resolve("cmd_full")))
    expect((await waitForResponse(discord)).content).toContain("five other tags")
    expect(thread.applied_tags).toEqual(fullTags)

    thread.applied_tags = [statusTagIds.open]
    discord.channels.get(feedbackChannelId)!.available_tags = [{ id: statusTagIds.open, name: "Open" }]
    await handler(signedRequest(resolve("cmd_missing")))
    expect((await waitForResponse(discord, 2)).content).toContain('no "resolved" status tag')

    await handler(signedRequest(resolve("cmd_noperm", "0")))
    expect((await waitForResponse(discord, 3)).content).toContain("do not have permission to use `/resolve`")
    expect(thread.applied_tags).toEqual([statusTagIds.open])
    expect(thread.thread_metadata?.archived).toBeUndefined()
  })
})
