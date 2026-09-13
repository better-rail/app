import { createPublicKey, verify } from "node:crypto"

import { type ConductorConfig, isSnowflake } from "./config"
import { DiscordApi } from "./discord"
import {
  clearButton,
  journeyComplete,
  platformPicker,
  platforms,
  selectPrefix,
  skipButton,
  startButton,
  stationPicker,
} from "./messages"
import { OnboardingRoles, PlatformRequired, type Selection } from "./roles"
import { stations } from "./stations"

type Interaction = {
  id: string
  application_id: string
  type: number
  guild_id?: string
  token?: string
  member?: { user?: { id?: string } }
  data?: { custom_id?: string; values?: string[] }
}

const privateMessage = (content: string) => ({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } })

export function verifySignature(request: Request, body: Buffer, publicKey: string, now = Date.now()) {
  const timestamp = request.headers.get("x-signature-timestamp") || ""
  const signature = request.headers.get("x-signature-ed25519") || ""
  if (!/^\d+$/.test(timestamp) || !/^[a-f0-9]{128}$/i.test(signature) || Math.abs(now / 1000 - Number(timestamp)) > 300)
    return false
  try {
    const key = createPublicKey({
      key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(publicKey, "hex")]),
      format: "der",
      type: "spki",
    })
    return verify(null, Buffer.concat([Buffer.from(timestamp), body]), key, Buffer.from(signature, "hex"))
  } catch {
    return false
  }
}

export function createHandler(
  config: ConductorConfig,
  api = new DiscordApi(config.botToken),
  roles = new OnboardingRoles(config, api),
) {
  const handled = new Map<string, { at: number; result: unknown }>()

  async function finish(interaction: Interaction, action: Selection) {
    let message: object
    try {
      const platform = await roles.choose(interaction.member!.user!.id!, action)
      const platformLabel = platforms.find((candidate) => candidate.id === platform)!.label
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
        message = {
          content:
            "🚦 I couldn't finish updating your ticket. Please try again; if it keeps happening, ask a developer to check my roles.",
          allowed_mentions: { parse: [] },
          components: platformPicker().components,
        }
        console.error("Conductor: onboarding role update failed")
      }
    }
    try {
      await api.call("PATCH", `/webhooks/${config.applicationId}/${interaction.token}/messages/@original`, message, false)
    } catch {
      console.error("Conductor: could not deliver onboarding response")
    }
  }

  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === "/health" && request.method === "GET") return Response.json({ ok: true, name: "The Conductor" })
    if (url.pathname !== "/discord/interactions") return new Response("Not found", { status: 404 })
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } })
    const body = Buffer.from(await request.arrayBuffer())
    if (body.length > 64_000) return new Response("Payload too large", { status: 413 })
    if (!verifySignature(request, body, config.publicKey)) return new Response("Invalid signature", { status: 401 })
    let interaction: Interaction
    try {
      interaction = JSON.parse(body.toString())
    } catch {
      return new Response("Invalid JSON", { status: 400 })
    }
    if (!interaction || interaction.application_id !== config.applicationId)
      return new Response("Wrong application", { status: 403 })
    if (interaction.type === 1) return Response.json({ type: 1 })
    if (interaction.guild_id !== config.guildId || !isSnowflake(interaction.member?.user?.id)) {
      return Response.json(privateMessage("🚂 My route runs through the Better Rail server. Start your journey there."))
    }
    if (!isSnowflake(interaction.id)) return new Response("Invalid interaction", { status: 400 })
    for (const [id, entry] of handled) if (entry.at < Date.now() - 300_000) handled.delete(id)
    const duplicate = handled.get(interaction.id)
    if (duplicate) return Response.json(duplicate.result)
    const data = interaction.data
    let result: unknown
    let action: Selection | undefined
    if (interaction.type === 3 && data?.custom_id === startButton) {
      result = { type: 4, data: { ...platformPicker(), flags: 64 } }
    } else if (interaction.type === 3 && data?.custom_id === skipButton) {
      action = { kind: "skip" }
    } else if (interaction.type === 3 && data?.custom_id === clearButton) {
      action = { kind: "station" }
    } else if (
      interaction.type === 3 &&
      typeof data?.custom_id === "string" &&
      /^conductor:platform:(ios|android)$/.test(data.custom_id)
    ) {
      action = { kind: "platform", id: data.custom_id.split(":")[2] }
    } else if (
      interaction.type === 3 &&
      typeof data?.custom_id === "string" &&
      /^conductor:station:[0-2]$/.test(data.custom_id)
    ) {
      const page = Number(data.custom_id.slice(selectPrefix.length))
      const value = Array.isArray(data.values) && data.values.length === 1 ? data.values[0] : undefined
      const stationId = stations.slice(page * 25, page * 25 + 25).find((station) => station.id === value)?.id
      if (stationId) action = { kind: "station", id: stationId }
      else result = privateMessage("🚦 That isn't a station on my route. Try picking again.")
    } else {
      result = { type: 4, data: { ...platformPicker(), flags: 64 } }
    }
    if (action) {
      if (typeof interaction.token !== "string" || !/^[A-Za-z0-9._-]{1,512}$/.test(interaction.token)) {
        return new Response("Invalid interaction token", { status: 400 })
      }
      // Acknowledge immediately; Discord allows only three seconds for this.
      result = { type: 5, data: { flags: 64 } }
    }
    handled.set(interaction.id, { at: Date.now(), result })
    const response = Response.json(result)
    if (action) void finish(interaction, action)
    return response
  }
}
