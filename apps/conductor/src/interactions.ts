import * as Sentry from "@sentry/bun"
import { createPublicKey, type KeyObject, verify } from "node:crypto"

import { type ConductorConfig, isSnowflake } from "./config"
import { DiscordApi } from "./discord"
import {
  backButton,
  clearButton,
  finishButton,
  journeyComplete,
  platformPicker,
  platformPrefix,
  selectPrefix,
  skipButton,
  stationPicker,
  stationPages,
  draftIds,
  searchPrefix,
  queryPrefix,
  resultPrefix,
  removePrefix,
  queryInput,
  stationSearch,
  searchStations,
} from "./messages"
import { OnboardingRoles, PlatformRequired, StationLimit, type Selection } from "./roles"
import { stations } from "./stations"

type Interaction = {
  id: string
  type: number
  token: string
  guild_id?: string
  member?: { user?: { id?: string } }
  data?: {
    custom_id?: string
    values?: string[]
    components?: { component?: { custom_id?: string; value?: string }; components?: { custom_id?: string; value?: string }[] }[]
  }
  message?: {
    flags?: number
    components?: { components?: { custom_id?: string; options?: { value: string; default?: boolean }[] }[] }[]
  }
}

// Draft selections travel in the bot's private message, returned in signed Discord interactions.
// No roles change until the member presses Finish.
function selectedStationIds(message: Interaction["message"]) {
  const finish = (message?.components ?? [])
    .flatMap((row) => row.components ?? [])
    .find((component) => component.custom_id?.startsWith(finishButton + ":"))
  if (finish) return draftIds(finish.custom_id!.slice(finishButton.length + 1))
  const ids = (message?.components ?? []).flatMap((row) =>
    (row.components ?? []).flatMap((component) =>
      component.custom_id?.startsWith(selectPrefix)
        ? (component.options ?? []).filter((option) => option.default).map((option) => option.value)
        : [],
    ),
  )
  return [...new Set(ids)].filter((id) => stations.some((station) => station.id === id))
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
      const selection = await roles.choose(userId, action)
      message = action.kind === "platform" ? stationPicker(selection.stationIds.slice(0, 2)) : journeyComplete()
    } catch (error) {
      if (error instanceof PlatformRequired) message = platformPicker()
      else if (error instanceof StationLimit) {
        const picker = stationPicker(action.kind === "station" ? action.ids.slice(0, 2) : [], true)
        message = { ...picker, content: picker.content + "\n\nאפשר לבחור עד שתי תחנות." }
      } else {
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

    const customId = ([3, 5].includes(interaction.type) && interaction.data?.custom_id) || ""
    const privateMessage = ((interaction.message?.flags ?? 0) & 64) !== 0
    const update = (message: object) =>
      privateMessage ? { type: 7, data: message } : { type: 4, data: { ...message, flags: 64 } }
    let action: Selection | undefined
    let result: unknown
    if (customId === skipButton) action = { kind: "skip" }
    else if (customId === clearButton) action = { kind: "station", ids: [] }
    else if (customId === finishButton) action = { kind: "station", ids: selectedStationIds(interaction.message) }
    else if (customId.startsWith(finishButton + ":"))
      action = { kind: "station", ids: draftIds(customId.slice(finishButton.length + 1)) }
    else if (customId.startsWith(searchPrefix) && interaction.type === 3) {
      const selected = draftIds(customId.slice(searchPrefix.length))
      result = selected.length < 2 ? { type: 9, data: stationSearch(selected) } : update(stationPicker(selected))
    } else if (customId.startsWith(queryPrefix) && interaction.type === 5) {
      const selected = draftIds(customId.slice(queryPrefix.length))
      const inputs = (interaction.data?.components ?? []).flatMap((row) =>
        row.component ? [row.component] : (row.components ?? []),
      )
      const query = inputs.find((input) => input.custom_id === queryInput)?.value ?? ""
      const matches = query.length <= 100 ? searchStations(query, selected) : []
      const note =
        matches.length > 25
          ? "יש הרבה תחנות מתאימות. נסו שם מדויק יותר אם התחנה שלכם לא ברשימה."
          : matches.length
            ? "מצאתי! בחרו תחנה מהרשימה."
            : "לא מצאתי תחנה נוספת בשם הזה. נסו לחפש שוב בעברית או באנגלית."
      result = update(stationPicker(selected, selected.length > 0, matches, note))
    } else if (customId.startsWith(resultPrefix) && interaction.type === 3) {
      const previous = draftIds(customId.slice(resultPrefix.length))
      const values = interaction.data?.values ?? []
      const offered =
        (interaction.message?.components ?? [])
          .flatMap((row) => row.components ?? [])
          .find((component) => component.custom_id === customId)?.options ?? []
      const valid =
        values.length === 1 &&
        offered.some((option) => option.value === values[0]) &&
        stations.some((station) => station.id === values[0]) &&
        !previous.includes(values[0]) &&
        previous.length < 2
      result = update(
        stationPicker(
          valid ? [...previous, values[0]] : previous,
          true,
          [],
          valid ? "" : "אפשר לבחור עד שתי תחנות שונות. נסו לחפש שוב.",
        ),
      )
    } else if (customId.startsWith(removePrefix) && interaction.type === 3) {
      const [id, state = ""] = customId.slice(removePrefix.length).split(":")
      result = update(
        stationPicker(
          draftIds(state).filter((selected) => selected !== id),
          true,
        ),
      )
    } else if (customId.startsWith(platformPrefix)) action = { kind: "platform", id: customId.slice(platformPrefix.length) }
    else if (customId === backButton) result = update(platformPicker())
    else if (customId.startsWith(selectPrefix)) {
      const page = stationPages[Number(customId.slice(selectPrefix.length))]
      const values = interaction.data?.values
      const previous = selectedStationIds(interaction.message).slice(0, 2)
      const valid = page && Array.isArray(values) && values.every((id) => page.some((station) => station.id === id))
      const selected = valid
        ? [...new Set([...previous.filter((id) => !page.some((station) => station.id === id)), ...values])]
        : previous
      const picker = stationPicker(selected.length <= 2 ? selected : previous, true)
      result = update(
        !valid || selected.length > 2
          ? { ...picker, content: picker.content + "\n\nאפשר לבחור עד שתי תחנות. הסירו אחת כדי לבחור אחרת." }
          : picker,
      )
    }

    // Role updates are deferred; Discord allows only three seconds to acknowledge.
    result ??= action
      ? privateMessage
        ? { type: 6 }
        : { type: 5, data: { flags: 64 } }
      : { type: 4, data: { ...platformPicker(), flags: 64 } }
    handled.set(interaction.id, { at: Date.now(), result })
    if (action) void finish(interaction.token, userId, action)
    return Response.json(result)
  }
}
