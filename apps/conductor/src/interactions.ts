import * as Sentry from "@sentry/bun"
import { createPublicKey, type KeyObject, verify } from "node:crypto"

import { type ConductorConfig, isSnowflake } from "./config"
import { DiscordApi } from "./discord"
import { EmailBridge, type SlashCommandInteraction } from "./email-bridge"
import { journeyComplete, platformPicker, platformPrefix } from "./messages"
import { ResendApi, type ResendEmailReceivedEvent, verifyResendSignature } from "./resend"
import { OnboardingRoles } from "./roles"

type Interaction = SlashCommandInteraction & {
  type: number
  data?: {
    custom_id?: string
    name?: string
    options?: Array<{ name: string; value: string | number | boolean }>
  }
  message?: { flags?: number }
}

function verifySignature(request: Request, body: Buffer, key: KeyObject) {
  const timestamp = request.headers.get("x-signature-timestamp") ?? ""
  const signature = Buffer.from(request.headers.get("x-signature-ed25519") ?? "", "hex")
  if (!(Math.abs(Date.now() / 1000 - Number(timestamp)) <= 300)) return false
  return verify(null, Buffer.concat([Buffer.from(timestamp), body]), key, signature)
}

export function createHandler(
  config: ConductorConfig,
  api = new DiscordApi(config.botToken),
  roles = new OnboardingRoles(config, api),
  resend = new ResendApi(config.resendApiKey || ""),
  emailBridge = new EmailBridge(config, api, resend),
) {
  const key = createPublicKey({
    key: { kty: "OKP", crv: "Ed25519", x: Buffer.from(config.publicKey, "hex").toString("base64url") },
    format: "jwk",
  })
  const handled = new Map<string, { at: number; result: unknown }>()

  const handledWebhooks = new Map<string, number>()

  async function finish(token: string, userId: string, platformId: string) {
    let message: object
    try {
      await roles.choose(userId, platformId)
      message = journeyComplete()
    } catch (error) {
      console.error("Conductor: onboarding role update failed:", (error as Error).message)
      // Bun drops async callers from stacks, so group by failure instead of by the shared throw site.
      Sentry.captureException(error, {
        tags: { selection: "platform" },
        fingerprint: ["role-update", (error as Error).message],
      })
      message = {
        ...platformPicker(),
        content: "🚦 נתקעתי רגע. נסו שוב. אם זה חוזר, כתבו למפתחים.",
      }
    }
    await api
      .call("PATCH", `/webhooks/${config.applicationId}/${token}/messages/@original`, message, false)
      .catch((error: Error) => {
        console.error("Conductor: could not deliver onboarding response:", error.message)
        Sentry.captureException(error, { fingerprint: ["delivery", error.message] })
      })
  }

  async function finishReply(interaction: SlashCommandInteraction) {
    try {
      const result = await emailBridge.handleReplyCommand(interaction)
      await api.call(
        "PATCH",
        `/webhooks/${config.applicationId}/${interaction.token}/messages/@original`,
        { content: result.message, allowed_mentions: { parse: [] } },
        false,
      )
    } catch (error) {
      console.error("Conductor: reply command failed:", (error as Error).message)
      Sentry.captureException(error, {
        tags: { command: "reply" },
        fingerprint: ["reply-command", (error as Error).message],
      })
      await api
        .call(
          "PATCH",
          `/webhooks/${config.applicationId}/${interaction.token}/messages/@original`,
          { content: `Failed to send reply: ${(error as Error).message}`, allowed_mentions: { parse: [] } },
          false,
        )
        .catch(() => {})
    }
  }

  async function processInboundEmail(emailId: string) {
    try {
      const email = await resend.getReceivedEmail(emailId)
      await emailBridge.handleInboundEmail(email)
    } catch (err) {
      console.error("Conductor: failed to process inbound email:", (err as Error).message)
      Sentry.captureException(err, { tags: { webhook: "resend" } })
    }
  }

  return async function handle(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname === "/health" && request.method === "GET") return Response.json({ ok: true, name: "The Conductor" })

    if (pathname === "/resend/webhook") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } })
      const body = Buffer.from(await request.arrayBuffer())

      if (!config.resendWebhookSecret || !config.resendApiKey) {
        return new Response("Webhook not configured", { status: 503 })
      }
      if (!verifyResendSignature(request, body, config.resendWebhookSecret)) {
        return new Response("Invalid signature", { status: 401 })
      }

      for (const [key, at] of handledWebhooks) {
        if (at < Date.now() - 300_000) handledWebhooks.delete(key)
      }

      try {
        const event: ResendEmailReceivedEvent = JSON.parse(body.toString())
        const dedupKey = request.headers.get("svix-id") || event.data?.email_id
        if (dedupKey && handledWebhooks.has(dedupKey)) {
          return Response.json({ ok: true })
        }
        if (dedupKey) {
          handledWebhooks.set(dedupKey, Date.now())
        }

        if (event.type === "email.received" && event.data?.email_id) {
          void processInboundEmail(event.data.email_id)
        }
        return Response.json({ ok: true })
      } catch (err) {
        console.error("Conductor: failed to parse Resend webhook:", (err as Error).message)
        Sentry.captureException(err, { tags: { webhook: "resend" } })
        return new Response("Internal Server Error", { status: 500 })
      }
    }

    if (pathname !== "/discord/interactions") return new Response("Not found", { status: 404 })
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } })
    const body = Buffer.from(await request.arrayBuffer())
    if (!verifySignature(request, body, key)) return new Response("Invalid signature", { status: 401 })
    const interaction: Interaction = JSON.parse(body.toString())
    if (interaction.type === 1) return Response.json({ type: 1 })

    for (const [id, entry] of handled) if (entry.at < Date.now() - 300_000) handled.delete(id)
    const duplicate = handled.get(interaction.id)
    if (duplicate) return Response.json(duplicate.result)

    if (interaction.type === 2 && interaction.data?.name === "reply") {
      if (interaction.guild_id !== config.guildId) {
        return Response.json({
          type: 4,
          data: { content: "Command not allowed in this server.", flags: 64 },
        })
      }

      const result = { type: 5 }
      handled.set(interaction.id, { at: Date.now(), result })
      void finishReply(interaction)
      return Response.json(result)
    }

    const userId = interaction.member?.user?.id
    if (interaction.guild_id !== config.guildId || !isSnowflake(userId)) {
      return Response.json({
        type: 4,
        data: { content: "🚂 אני הכרטיסן של Better Rail. התחילו שם, בערוץ קבלת הפנים.", flags: 64 },
      })
    }

    const customId = interaction.type === 3 ? (interaction.data?.custom_id ?? "") : ""
    const privateMessage = ((interaction.message?.flags ?? 0) & 64) !== 0
    const platformId = customId.startsWith(platformPrefix) ? customId.slice(platformPrefix.length) : undefined
    // Role updates are deferred; Discord allows only three seconds to acknowledge.
    // Retired station buttons and modals return to device selection without changing roles.
    const result =
      platformId !== undefined
        ? privateMessage
          ? { type: 6 }
          : { type: 5, data: { flags: 64 } }
        : privateMessage
          ? { type: 7, data: platformPicker() }
          : { type: 4, data: { ...platformPicker(), flags: 64 } }
    handled.set(interaction.id, { at: Date.now(), result })
    if (platformId !== undefined) void finish(interaction.token, userId, platformId)
    return Response.json(result)
  }
}

