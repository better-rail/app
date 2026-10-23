import * as Sentry from "@sentry/cloudflare"

import { concatBytes, decodeUtf8, encodeUtf8, fromHex } from "./bytes"
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

/** What the Worker's `ExecutionContext` offers: work that must outlive the response. */
export type HandlerContext = { waitUntil(promise: Promise<unknown>): void }

async function verifySignature(request: Request, body: Uint8Array, key: Promise<CryptoKey>) {
  const timestamp = request.headers.get("x-signature-timestamp") ?? ""
  const signature = fromHex(request.headers.get("x-signature-ed25519") ?? "")
  if (!(Math.abs(Date.now() / 1000 - Number(timestamp)) <= 300)) return false
  if (signature?.length !== 64) return false
  return crypto.subtle.verify("Ed25519", await key, signature, concatBytes(encodeUtf8(timestamp), body))
}

export function createHandler(
  config: ConductorConfig,
  api = new DiscordApi(config.botToken),
  roles = new OnboardingRoles(config, api),
  resend = new ResendApi(config.resendApiKey || ""),
  emailBridge = new EmailBridge(config, api, resend),
) {
  let key: Promise<CryptoKey> | undefined
  const publicKey = () =>
    (key ??= crypto.subtle.importKey("raw", fromHex(config.publicKey) ?? new Uint8Array(), { name: "Ed25519" }, false, [
      "verify",
    ]))
  // Replay caches live for the handler, i.e. per Worker isolate: a retry that lands elsewhere is verified again, not deduplicated.
  const handled = new Map<string, { at: number; result: unknown }>()

  const handledWebhooks = new Map<string, number>()

  async function finish(token: string, userId: string, platformId: string) {
    let message: object
    try {
      await roles.choose(userId, platformId)
      message = journeyComplete()
    } catch (error) {
      console.error("Conductor: onboarding role update failed:", (error as Error).message)
      // Stacks vary across isolates and async hops, so group by failure instead of by the shared throw site.
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

  async function processInboundEmail(emailId: string, fallbackMessageId?: string) {
    try {
      const email = await resend.getReceivedEmail(emailId)
      if (!email.message_id && fallbackMessageId) {
        email.message_id = fallbackMessageId
      }
      await emailBridge.handleInboundEmail(email)
    } catch (err) {
      console.error("Conductor: failed to process inbound email:", (err as Error).message)
      Sentry.captureException(err, { tags: { webhook: "resend" } })
    }
  }

  return async function handle(request: Request, context?: HandlerContext): Promise<Response> {
    // Discord allows three seconds to acknowledge, so the work follows the response; Workers keep it running only via waitUntil.
    const background = (work: Promise<void>) => (context ? context.waitUntil(work) : void work)
    const { pathname } = new URL(request.url)
    if (pathname === "/health" && request.method === "GET") return Response.json({ ok: true, name: "The Conductor" })

    if (pathname === "/resend/webhook") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } })
      const body = new Uint8Array(await request.arrayBuffer())

      if (!config.resendWebhookSecret || !config.resendApiKey) {
        return new Response("Webhook not configured", { status: 503 })
      }
      if (!(await verifyResendSignature(request, body, config.resendWebhookSecret))) {
        return new Response("Invalid signature", { status: 401 })
      }

      for (const [key, at] of handledWebhooks) {
        if (at < Date.now() - 300_000) handledWebhooks.delete(key)
      }

      try {
        const event: ResendEmailReceivedEvent = JSON.parse(decodeUtf8(body))
        const dedupKey = request.headers.get("svix-id") || event.data?.email_id
        if (dedupKey && handledWebhooks.has(dedupKey)) {
          return Response.json({ ok: true })
        }
        if (dedupKey) {
          handledWebhooks.set(dedupKey, Date.now())
        }

        if (event.type === "email.received" && event.data?.email_id) {
          background(processInboundEmail(event.data.email_id, event.data?.message_id))
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
    const body = new Uint8Array(await request.arrayBuffer())
    if (!(await verifySignature(request, body, publicKey()))) return new Response("Invalid signature", { status: 401 })
    const interaction: Interaction = JSON.parse(decodeUtf8(body))
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
      background(finishReply(interaction))
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
    if (platformId !== undefined) background(finish(interaction.token, userId, platformId))
    return Response.json(result)
  }
}
