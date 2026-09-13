import * as Sentry from "@sentry/bun"
import { createPublicKey, type KeyObject, verify } from "node:crypto"

import { type ConductorConfig, isSnowflake } from "./config"
import { DiscordApi } from "./discord"
import {
  clearButton,
  journeyComplete,
  platformPicker,
  platformPrefix,
  platforms,
  selectPrefix,
  skipButton,
  stationPicker,
} from "./messages"
import { OnboardingRoles, PlatformRequired, type Selection } from "./roles"
import { stations } from "./stations"

type Interaction = {
  id: string
  type: number
  token: string
  guild_id?: string
  member?: { user?: { id?: string } }
  data?: { custom_id?: string; values?: string[] }
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
) {
  const key = createPublicKey({
    key: { kty: "OKP", crv: "Ed25519", x: Buffer.from(config.publicKey, "hex").toString("base64url") },
    format: "jwk",
  })
  const handled = new Map<string, { at: number; result: unknown }>()

  async function finish(token: string, userId: string, action: Selection) {
    let message: object
    try {
      const platformId = await roles.choose(userId, action)
      const platformLabel = platforms.find((platform) => platform.id === platformId)!.label
      message =
        action.kind === "platform"
          ? stationPicker(platformLabel)
          : journeyComplete(
              platformLabel,
              action.kind === "station" ? stations.find((station) => station.id === action.id)?.name : undefined,
              action.kind === "skip",
            )
    } catch (error) {
      if (error instanceof PlatformRequired) message = platformPicker()
      else {
        console.error("Conductor: onboarding role update failed:", (error as Error).message)
        // Bun drops async callers from stacks, so group by failure instead of by the shared throw site.
        Sentry.captureException(error, {
          tags: { selection: action.kind },
          fingerprint: ["role-update", (error as Error).message],
        })
        message = {
          ...platformPicker(),
          content: "🚦 נתקעתי רגע. נסו שוב. אם זה חוזר, כתבו למפתחים.",
        }
      }
    }
    await api
      .call("PATCH", `/webhooks/${config.applicationId}/${token}/messages/@original`, message, false)
      .catch((error: Error) => {
        console.error("Conductor: could not deliver onboarding response:", error.message)
        Sentry.captureException(error, { fingerprint: ["delivery", error.message] })
      })
  }

  return async function handle(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname === "/health" && request.method === "GET") return Response.json({ ok: true, name: "The Conductor" })
    if (pathname !== "/discord/interactions") return new Response("Not found", { status: 404 })
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } })
    const body = Buffer.from(await request.arrayBuffer())
    if (!verifySignature(request, body, key)) return new Response("Invalid signature", { status: 401 })
    const interaction: Interaction = JSON.parse(body.toString())
    if (interaction.type === 1) return Response.json({ type: 1 })
    const userId = interaction.member?.user?.id
    if (interaction.guild_id !== config.guildId || !isSnowflake(userId)) {
      return Response.json({
        type: 4,
        data: { content: "🚂 אני הכרטיסן של Better Rail. התחילו שם, בערוץ קבלת הפנים.", flags: 64 },
      })
    }
    for (const [id, entry] of handled) if (entry.at < Date.now() - 300_000) handled.delete(id)
    const duplicate = handled.get(interaction.id)
    if (duplicate) return Response.json(duplicate.result)

    const customId = (interaction.type === 3 && interaction.data?.custom_id) || ""
    let action: Selection | undefined
    if (customId === skipButton) action = { kind: "skip" }
    else if (customId === clearButton) action = { kind: "station" }
    else if (customId.startsWith(platformPrefix)) action = { kind: "platform", id: customId.slice(platformPrefix.length) }
    else if (customId.startsWith(selectPrefix)) action = { kind: "station", id: interaction.data?.values?.[0] }

    // Role updates are deferred; Discord allows only three seconds to acknowledge.
    const result = action ? { type: 5, data: { flags: 64 } } : { type: 4, data: { ...platformPicker(), flags: 64 } }
    handled.set(interaction.id, { at: Date.now(), result })
    if (action) void finish(interaction.token, userId, action)
    return Response.json(result)
  }
}
