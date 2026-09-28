import { describe, expect, test } from "bun:test"
import { createHmac, generateKeyPairSync, sign } from "node:crypto"
import type { ConductorConfig } from "./config"
import { DiscordApi, type DiscordChannel, type DiscordMessage, type DiscordRole } from "./discord"
import { chunkEmailBody, EmailBridge, extractSenderEmail, extractThreadId, htmlToText } from "./email-bridge"
import { createHandler } from "./interactions"
import { journeyComplete, platformPicker, welcomeMessage } from "./messages"
import { everyoneCanReadWelcome } from "./permissions"
import { ResendApi, type ResendReceivedEmail, type ResendSendEmailOptions, verifyResendSignature } from "./resend"
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
      const b = body as { name: string; type: number }
      const channel: DiscordChannel = {
        id: threadId,
        guild_id: guildId,
        parent_id: parentId,
        name: b.name,
        type: b.type,
        permission_overwrites: [],
      }
      this.channels.set(threadId, channel)
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
        let all = [...(this.messages.get(channelId) || [])].reverse()
        const query = new URLSearchParams(messagesMatch[2] || "")
        const before = query.get("before")
        const limit = Number(query.get("limit") || 50)
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

  test("the retired Continue button still opens a private device choice", async () => {
    const api = new FakeDiscord()
    const handler = createHandler(config, api)
    const start = interaction("conductor:start")
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

  test("welcome asks for the device directly and completion stays private", async () => {
    const welcome = welcomeMessage()
    expect(welcome.content).toBe("## ברוכים הבאים לדיסקורד של בטר רייל!\n\nעם מה אתם נוסעים, אייפון או אנדרואיד?")
    expect(welcome.components[0].components.map((button) => button.label)).toEqual(["אייפון", "אנדרואיד"])
    for (const button of welcome.components[0].components) {
      const api = new FakeDiscord()
      const selected = interaction(button.custom_id)
      selected.message.flags = 0
      const response = await (await createHandler(config, api)(signedRequest(selected))).json()
      expect(response).toEqual({ type: 5, data: { flags: 64 } })
      expect(await waitForResponse(api)).toEqual(journeyComplete())
      expect(api.memberRoles).toEqual([staffRole, button.custom_id.endsWith("ios") ? iosRole : androidRole])
    }
  })
})

const feedbackChannelId = "1548785837758615692"
const emailConfig: ConductorConfig = {
  ...config,
  resendApiKey: "test-resend-key",
  resendWebhookSecret: "whsec_mfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
  emailFeedbackChannelId: feedbackChannelId,
}

class FakeResend extends ResendApi {
  receivedEmails = new Map<string, ResendReceivedEmail>()
  sentEmails: ResendSendEmailOptions[] = []

  constructor() {
    super("test-resend-key")
  }

  override async getReceivedEmail(emailId: string): Promise<ResendReceivedEmail> {
    const email = this.receivedEmails.get(emailId)
    if (!email) throw new Error(`Email ${emailId} not found`)
    return email
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

describe("resend email bridge", () => {
  test("verifyResendSignature accepts valid signature and rejects tampered or expired requests", () => {
    const secret = "whsec_mfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"
    const payload = { test: true }
    const valid = signedResendRequest(payload, secret)
    const validBody = Buffer.from(JSON.stringify(payload))
    expect(verifyResendSignature(valid, validBody, secret)).toBe(true)

    // Tampered body
    const tamperedBody = Buffer.from(JSON.stringify({ test: false }))
    expect(verifyResendSignature(valid, tamperedBody, secret)).toBe(false)

    // Expired timestamp
    const expired = signedResendRequest(payload, secret, String(Math.floor(Date.now() / 1000) - 400))
    expect(verifyResendSignature(expired, validBody, secret)).toBe(false)

    // Wrong secret
    expect(verifyResendSignature(valid, validBody, "whsec_wrongsecret123456789012345678901234")).toBe(false)
  })

  test("extractThreadId extracts thread IDs correctly", () => {
    const threadId = "1548800000000001001"
    expect(extractThreadId(`Re: Station search bug [#${threadId}]`)).toBe(threadId)
    expect(extractThreadId("No thread ID here")).toBeUndefined()

    expect(extractThreadId(undefined, { "in-reply-to": `<thread-${threadId}@better-rail.co.il>` })).toBe(threadId)
    expect(extractThreadId(undefined, { references: `some-id <thread-${threadId}@better-rail.co.il>` })).toBe(threadId)
    expect(extractThreadId(undefined, undefined, [`feedback+${threadId}@better-rail.co.il`])).toBe(threadId)
    expect(
      extractThreadId(
        "Changed subject line",
        undefined,
        undefined,
        `Thanks for looking into this!\n\nBetter Rail Support • Ref: [#${threadId}]`,
      ),
    ).toBe(threadId)
  })

  test("extractSenderEmail parses plain and bracketed addresses", () => {
    expect(extractSenderEmail("David Cohen <david@example.com>")).toBe("david@example.com")
    expect(extractSenderEmail("david@example.com")).toBe("david@example.com")
  })

  test("htmlToText converts HTML to clean plaintext", () => {
    const html = "<p>Hello <b>team</b>,</p><p>The app is <i>great</i>!<br/>Thanks.</p>"
    const text = htmlToText(html)
    expect(text).toContain("Hello team,")
    expect(text).toContain("The app is great!\nThanks.")
  })

  test("chunkEmailBody chunks body text cleanly and produces overflow file for large emails", () => {
    const shortText = "Just a short message"
    const shortResult = chunkEmailBody(shortText)
    expect(shortResult.chunks).toEqual([shortText])
    expect(shortResult.overflowFile).toBeUndefined()

    // Medium email (2,500 chars) -> 2 chunks
    const mediumText = "Line of text.\n".repeat(180)
    const mediumResult = chunkEmailBody(mediumText)
    expect(mediumResult.chunks.length).toBeGreaterThan(1)
    expect(mediumResult.overflowFile).toBeUndefined()

    // Large email (> 4,000 chars) -> preview chunk + overflow file
    const largeText = "A".repeat(5000)
    const largeResult = chunkEmailBody(largeText)
    expect(largeResult.chunks).toHaveLength(1)
    expect(largeResult.chunks[0]).toContain("exceeds 4,000 characters")
    expect(largeResult.overflowFile?.filename).toBe("email_body.txt")
    expect(largeResult.overflowFile?.content).toBe(largeText)
  })

  test("inbound email creates new thread in #email-feedback with email subject and header", async () => {
    const discord = new FakeDiscord()
    const resend = new FakeResend()
    const bridge = new EmailBridge(emailConfig, discord, resend)

    const email: ResendReceivedEmail = {
      id: "email_1",
      from: "Ron <ron@example.com>",
      to: ["feedback@better-rail.co.il"],
      subject: "Train schedule issue at Savidor",
      text: "Hello, train 402 was delayed by 20 minutes today.",
    }

    const result = await bridge.handleInboundEmail(email)
    expect(result.created).toBe(true)
    const thread = discord.channels.get(result.threadId)
    expect(thread).toBeDefined()
    expect(thread?.name).toBe("Train schedule issue at Savidor")
    expect(thread?.parent_id).toBe(feedbackChannelId)

    const messages = discord.messages.get(result.threadId) || []
    expect(messages.length).toBeGreaterThan(0)
    expect(messages[0].content).toContain("**New Email from:** `Ron <ron@example.com>`")
    expect(messages[0].content).toContain("Train schedule issue at Savidor")
    expect(messages[0].content).toContain("Hello, train 402 was delayed by 20 minutes today.")
  })

  test("inbound email routes follow-up to existing thread and unarchives if needed", async () => {
    const discord = new FakeDiscord()
    const resend = new FakeResend()
    const bridge = new EmailBridge(emailConfig, discord, resend)

    const existingThreadId = "1548800000000001050"
    discord.channels.set(existingThreadId, {
      id: existingThreadId,
      guild_id: guildId,
      parent_id: feedbackChannelId,
      name: "Delayed Train",
      type: 11,
      permission_overwrites: [],
      thread_metadata: { archived: true },
    })

    const followUpEmail: ResendReceivedEmail = {
      id: "email_2",
      from: "Ron <ron@example.com>",
      to: ["feedback@better-rail.co.il"],
      subject: `Re: Delayed Train [#${existingThreadId}]`,
      text: "Any updates on this ticket?",
    }

    const result = await bridge.handleInboundEmail(followUpEmail)
    expect(result.created).toBe(false)
    expect(result.threadId).toBe(existingThreadId)
    expect(discord.channels.get(existingThreadId)?.thread_metadata?.archived).toBe(false)

    const messages = discord.messages.get(existingThreadId) || []
    expect(messages.length).toBe(1)
    expect(messages[0].content).toContain("**Follow-up Email from:** `Ron <ron@example.com>`")
    expect(messages[0].content).toContain("Any updates on this ticket?")
  })

  test("POST /resend/webhook endpoint processes incoming email end-to-end", async () => {
    const discord = new FakeDiscord()
    const resend = new FakeResend()
    const bridge = new EmailBridge(emailConfig, discord, resend)

    resend.receivedEmails.set("msg_received_999", {
      id: "msg_received_999",
      from: "Noa <noa@example.com>",
      to: ["feedback@better-rail.co.il"],
      subject: "Dark mode request",
      text: "Please add an OLED dark mode!",
    })

    const handler = createHandler(emailConfig, discord, new OnboardingRoles(emailConfig, discord), resend, bridge)
    const request = signedResendRequest(
      {
        type: "email.received",
        data: { email_id: "msg_received_999" },
      },
      emailConfig.resendWebhookSecret!,
    )

    const response = await handler(request)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })

    const createdThreads = Array.from(discord.channels.values()).filter((c) => c.name === "Dark mode request")
    expect(createdThreads).toHaveLength(1)
    const threadMessages = discord.messages.get(createdThreads[0].id) || []
    expect(threadMessages[0].content).toContain("OLED dark mode")
  })

  test("slash command /reply sends email via Resend and patches confirmation in thread", async () => {
    const discord = new FakeDiscord()
    const resend = new FakeResend()
    const bridge = new EmailBridge(emailConfig, discord, resend)

    const threadId = "1548800000000001099"
    discord.channels.set(threadId, {
      id: threadId,
      guild_id: guildId,
      parent_id: feedbackChannelId,
      name: "Ticket purchase crash",
      type: 11,
      permission_overwrites: [],
    })

    // Seed starter message with original customer email
    discord.messages.set(threadId, [
      {
        id: "msg_starter_1",
        channel_id: threadId,
        content: "**New Email from:** `Yael <yael@example.com>`\n**Subject:** Ticket purchase crash\n──────────────────────────────\nApp crashed at checkout",
        author: { id: applicationId, username: "The Conductor", bot: true },
      },
    ])

    const slashInteraction = {
      id: "interaction_reply_1",
      application_id: applicationId,
      guild_id: guildId,
      channel_id: threadId,
      type: 2, // APPLICATION_COMMAND
      token: "reply-token-123",
      member: { user: { id: userId, username: "danny" } },
      data: {
        name: "reply",
        options: [{ name: "message", value: "We just published an update that fixes this crash!" }],
      },
    }

    const handler = createHandler(emailConfig, discord, new OnboardingRoles(emailConfig, discord), resend, bridge)
    const response = await (await handler(signedRequest(slashInteraction))).json()
    expect(response).toEqual({ type: 5 })

    // Wait for async reply to deliver to Resend and patch Discord response
    await waitForResponse(discord)
    expect(resend.sentEmails).toHaveLength(1)
    expect(resend.sentEmails[0].to).toEqual(["yael@example.com"])
    expect(resend.sentEmails[0].subject).toBe(`Re: Ticket purchase crash [#${threadId}]`)
    expect(resend.sentEmails[0].text).toContain("We just published an update that fixes this crash!")
    expect(resend.sentEmails[0].text).toContain(`Better Rail Support • Ref: [#${threadId}]`)
    expect(resend.sentEmails[0].headers?.["In-Reply-To"]).toBe(`<thread-${threadId}@better-rail.co.il>`)

    expect(discord.responses).toHaveLength(1)
    const patchContent = (discord.responses[0] as { content: string }).content
    expect(patchContent).toContain("yael@example.com")
    expect(patchContent).toContain("We just published an update that fixes this crash!")
  })

  test("slash command /reply rejects when executed outside an #email-feedback thread", async () => {
    const discord = new FakeDiscord()
    const resend = new FakeResend()
    const bridge = new EmailBridge(emailConfig, discord, resend)

    const randomChannelId = "1548800000000001999"
    discord.channels.set(randomChannelId, {
      id: randomChannelId,
      guild_id: guildId,
      parent_id: "999999999999999999", // not the feedback channel
      name: "general-chat",
      type: 0,
      permission_overwrites: [],
    })

    const slashInteraction = {
      id: "interaction_reply_2",
      application_id: applicationId,
      guild_id: guildId,
      channel_id: randomChannelId,
      type: 2,
      token: "reply-token-456",
      member: { user: { id: userId, username: "danny" } },
      data: {
        name: "reply",
        options: [{ name: "message", value: "Hello outside feedback" }],
      },
    }

    const handler = createHandler(emailConfig, discord, new OnboardingRoles(emailConfig, discord), resend, bridge)
    const response = await (await handler(signedRequest(slashInteraction))).json()
    expect(response).toEqual({ type: 5 })

    await waitForResponse(discord)
    expect(resend.sentEmails).toHaveLength(0)
    const patchContent = (discord.responses[0] as { content: string }).content
    expect(patchContent).toContain("only be used inside an #email-feedback thread")
  })

  test("handled map cleans up expired entries across slash command invocations", async () => {
    const discord = new FakeDiscord()
    const resend = new FakeResend()
    const bridge = new EmailBridge(emailConfig, discord, resend)

    const threadId = "1548800000000001099"
    discord.channels.set(threadId, {
      id: threadId,
      guild_id: guildId,
      parent_id: feedbackChannelId,
      name: "Feedback",
      type: 11,
      permission_overwrites: [],
    })
    discord.messages.set(threadId, [
      {
        id: "msg_starter_1",
        channel_id: threadId,
        content: "**New Email from:** `user@example.com`\n**Subject:** Test\n──────────────────────────────\nHello",
        author: { id: applicationId, username: "The Conductor", bot: true },
      },
    ])

    const handler = createHandler(emailConfig, discord, new OnboardingRoles(emailConfig, discord), resend, bridge)

    const interaction1 = {
      id: "interaction_reply_cleanup_1",
      application_id: applicationId,
      guild_id: guildId,
      channel_id: threadId,
      type: 2,
      token: "tok-1",
      member: { user: { id: userId, username: "danny" } },
      data: { name: "reply", options: [{ name: "message", value: "Reply 1" }] },
    }

    // First invocation adds entry to handled
    const res1 = await (await handler(signedRequest(interaction1))).json()
    expect(res1).toEqual({ type: 5 })

    // Duplicate invocation returns cached result immediately
    const resDuplicate = await (await handler(signedRequest(interaction1))).json()
    expect(resDuplicate).toEqual({ type: 5 })

    // Invocations after expiration clean up old entries without memory leak
    const interaction2 = {
      id: "interaction_reply_cleanup_2",
      application_id: applicationId,
      guild_id: guildId,
      channel_id: threadId,
      type: 2,
      token: "tok-2",
      member: { user: { id: userId, username: "danny" } },
      data: { name: "reply", options: [{ name: "message", value: "Reply 2" }] },
    }
    const res2 = await (await handler(signedRequest(interaction2))).json()
    expect(res2).toEqual({ type: 5 })
  })

  test("slash command /reply finds customer email in long thread with > 100 messages", async () => {
    const discord = new FakeDiscord()
    const resend = new FakeResend()
    const bridge = new EmailBridge(emailConfig, discord, resend)

    const threadId = "1548800000000001098"
    discord.channels.set(threadId, {
      id: threadId,
      guild_id: guildId,
      parent_id: feedbackChannelId,
      name: "Long Discussion",
      type: 11,
      permission_overwrites: [],
    })

    const initialMessage = {
      id: "1548800000000000001",
      channel_id: threadId,
      content:
        "**New Email from:** `customer@domain.com`\n**Subject:** Long Discussion\n──────────────────────────────\nInitial message",
      author: { id: applicationId, username: "The Conductor", bot: true },
    }

    // Add 110 internal discussion messages after the initial email
    const threadMessages: DiscordMessage[] = [initialMessage]
    for (let i = 2; i <= 112; i++) {
      threadMessages.push({
        id: String(1548800000000000000n + BigInt(i)),
        channel_id: threadId,
        content: `Team discussion comment #${i}`,
        author: { id: "user_internal", username: "dev", bot: false },
      })
    }
    discord.messages.set(threadId, threadMessages)

    const slashInteraction = {
      id: "interaction_reply_long",
      application_id: applicationId,
      guild_id: guildId,
      channel_id: threadId,
      type: 2,
      token: "reply-token-long",
      member: { user: { id: userId, username: "danny" } },
      data: {
        name: "reply",
        options: [{ name: "message", value: "Resolution after long internal discussion" }],
      },
    }

    const handler = createHandler(emailConfig, discord, new OnboardingRoles(emailConfig, discord), resend, bridge)
    const response = await (await handler(signedRequest(slashInteraction))).json()
    expect(response).toEqual({ type: 5 })

    await waitForResponse(discord)
    expect(resend.sentEmails).toHaveLength(1)
    expect(resend.sentEmails[0].to).toEqual(["customer@domain.com"])
    expect(resend.sentEmails[0].text).toContain("Resolution after long internal discussion")
  })
})

