import { describe, expect, test } from "bun:test"
import { generateKeyPairSync, sign } from "node:crypto"

import type { ConductorConfig } from "./config"
import { DiscordApi, type DiscordChannel, type DiscordRole } from "./discord"
import { createHandler } from "./interactions"
import {
  backButton,
  draftIds,
  finishButton,
  queryInput,
  queryPrefix,
  removePrefix,
  resultPrefix,
  searchPrefix,
  searchStations,
  selectPrefix,
  stationPicker,
  stationPages,
  welcomeMessage,
} from "./messages"
import { everyoneCanView } from "./permissions"
import { isFlairRole, OnboardingRoles, PlatformRequired, StationLimit } from "./roles"
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
const hashmonaRole = "1548800000000000008"
const binyaminaRole = "1548800000000000009"
const config: ConductorConfig = {
  applicationId,
  guildId,
  publicKey,
  botToken: "test-only",
  platformRoles: { ios: iosRole, android: androidRole },
  stationRoles: { "4600": hashalomRole, "4900": hahaganaRole, "2100": hashmonaRole, "2800": binyaminaRole },
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
      [hashalomRole, "hashalom"],
      [hahaganaRole, "hahagana"],
      [hashmonaRole, "hashmona"],
      [binyaminaRole, "binyamina"],
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

function defaultSelections(message: ReturnType<typeof stationPicker>) {
  for (const row of message.components) {
    for (const component of row.components) {
      if (component.custom_id.startsWith(finishButton + ":")) {
        return draftIds(component.custom_id.slice(finishButton.length + 1))
      }
    }
  }
  return []
}

function legacyPicker(selected: string[] = []) {
  return {
    components: stationPages.map((page, index) => ({
      components: [
        {
          custom_id: selectPrefix + index,
          options: page.map((station) => ({ value: station.id, default: selected.includes(station.id) })),
        },
      ],
    })),
  }
}

function modal(query: string, selected: string[] = [], message?: { components: unknown[] }) {
  return {
    ...interaction(queryPrefix + selected.join(","), undefined, message),
    type: 5,
    data: {
      custom_id: queryPrefix + selected.join(","),
      components: [{ type: 18, component: { type: 4, custom_id: queryInput, value: query } }],
    },
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

  test("start asks for a required device with no skip button", async () => {
    const result = await (await createHandler(config, new FakeDiscord())(signedRequest(interaction("conductor:start")))).json()
    expect(result.data.flags).toBe(64)
    expect(result.data.components[0].components.map((button: { label: string }) => button.label)).toEqual(["אייפון", "אנדרואיד"])
    expect(JSON.stringify(result)).not.toContain("conductor:skip")
  })

  test("device selection advances to optional station selection; skipping completes", async () => {
    const api = new FakeDiscord()
    const handler = createHandler(config, api)
    expect(await (await handler(signedRequest(interaction("conductor:platform:ios")))).json()).toEqual({
      type: 6,
    })
    const stationStep = await waitForResponse(api)
    expect(stationStep.content).toContain("2 / 2")
    expect(JSON.stringify(stationStep.components)).toContain("דילוג")
    await handler(signedRequest(interaction("conductor:skip")))
    const completed = await waitForResponse(api, 2)
    expect(completed.content).toContain("תודה רבה!")
    expect(completed.content).toContain("<#1548778686671757373>")
    expect(completed.content).toContain("<#1548778257866817626>")
    expect(api.memberRoles).toEqual([staffRole, iosRole])
  })

  test("station selection changes only station flair", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, hahaganaRole)
    const handler = createHandler(config, api)
    const draft = await (await handler(signedRequest(interaction(`${selectPrefix}0`, ["4600"], legacyPicker(["4900"]))))).json()
    expect(api.memberRoles).toContain(hahaganaRole)
    expect(api.mutations).toHaveLength(0)
    await handler(signedRequest(interaction(finishButton, undefined, draft.data)))
    await waitForResponse(api)
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole, hashalomRole]))
    await handler(signedRequest(interaction("conductor:clear")))
    await waitForResponse(api, 2)
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole]))
  })

  test("skip and station choice cannot bypass required device selection", async () => {
    const api = new FakeDiscord()
    const roles = new OnboardingRoles(config, api)
    await expect(roles.choose(userId, { kind: "skip" })).rejects.toBeInstanceOf(PlatformRequired)
    await expect(roles.choose(userId, { kind: "station", ids: ["4600"] })).rejects.toBeInstanceOf(PlatformRequired)
    const handler = createHandler(config, api, roles)
    await handler(signedRequest(interaction("conductor:skip")))
    expect((await waitForResponse(api)).content).toContain("עם מה אתם נוסעים")
    expect(api.mutations).toHaveLength(0)
  })

  test("two station selections are saved only when Finish is pressed", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole)
    const handler = createHandler(config, api)
    const draft = await (await handler(signedRequest(interaction(`${selectPrefix}0`, ["4600", "4900"], legacyPicker())))).json()
    expect(draft.type).toBe(7)
    expect(defaultSelections(draft.data)).toEqual(["4600", "4900"])
    expect(api.mutations).toHaveLength(0)
    expect(JSON.stringify(draft.data.components)).toContain("סיום")
    await handler(signedRequest(interaction(finishButton, undefined, draft.data)))
    const completed = await waitForResponse(api)
    expect(completed.components).toEqual([])
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole, hashalomRole, hahaganaRole]))
  })

  test("search auto-selects the closest station in English and Hebrew without changing roles before Finish", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole)
    const handler = createHandler(config, api)
    const opened = await (await handler(signedRequest(interaction(searchPrefix)))).json()
    expect(opened.type).toBe(9)
    expect(opened.data.title).toBe("חיפוש תחנה")
    expect(opened.data.components[0].component.custom_id).toBe(queryInput)
    const first = await (await handler(signedRequest(modal("ha shalom")))).json()
    expect(defaultSelections(first.data)).toEqual(["4600"])
    expect(JSON.stringify(first.data.components)).not.toContain(resultPrefix)
    expect(first.data.content).toContain("תל אביב - השלום")
    const second = await (await handler(signedRequest(modal("השמונה", ["4600"])))).json()
    expect(defaultSelections(second.data)).toEqual(["4600", "2100"])
    expect(JSON.stringify(second.data)).not.toContain(searchPrefix)
    expect(api.mutations).toHaveLength(0)
    await handler(signedRequest(interaction(finishButton + ":4600,2100", undefined, second.data)))
    await waitForResponse(api)
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole, hashalomRole, hashmonaRole]))
  })

  test("empty searches preserve drafts; broad searches select the best result without a dropdown", async () => {
    const handler = createHandler(config, new FakeDiscord())
    for (const query of ["does not exist", " ", "!!!"]) {
      const result = await (await handler(signedRequest(modal(query, ["4600"])))).json()
      expect(result.type).toBe(7)
      expect(result.data.content).toContain("לא מצאתי")
      expect(defaultSelections(result.data)).toEqual(["4600"])
      expect(JSON.stringify(result.data.components)).not.toContain(resultPrefix)
    }
    const broad = await (await handler(signedRequest(modal("a")))).json()
    expect(defaultSelections(broad.data)).toEqual([searchStations("a")[0].id])
    expect(JSON.stringify(broad.data.components)).not.toContain(resultPrefix)
    const noMessage = modal("שלום")
    delete (noMessage as { message?: unknown }).message
    const fallback = await (await handler(signedRequest(noMessage))).json()
    expect(fallback.type).toBe(4)
    expect(fallback.data.flags).toBe(64)
  })

  test("unoffered, duplicate, and third results cannot change draft selections", async () => {
    const api = new FakeDiscord()
    const handler = createHandler(config, api)
    const results = { data: stationPicker(["2100"], true, searchStations("שלום", ["2100"])) }
    const forged = await (await handler(signedRequest(interaction(resultPrefix + "2100", ["4900"], results.data)))).json()
    expect(defaultSelections(forged.data)).toEqual(["2100"])
    const duplicate = await (await handler(signedRequest(modal("שלום", ["4600"])))).json()
    expect(defaultSelections(duplicate.data)).toEqual(["4600"])
    expect(duplicate.data.content).toContain("כבר בבחירה")
    const third = await (await handler(signedRequest(modal("binyamina", ["4600", "2100"])))).json()
    expect(defaultSelections(third.data)).toEqual(["4600", "2100"])
    expect(api.mutations).toHaveLength(0)
  })

  test("matching ranks exact station names before partial matches", () => {
    expect(searchStations("netanya")[0].name).toBe("netanya")
    expect(searchStations("נתניה - ספיר")[0].name).toBe("netanya sapir")
    expect(searchStations("bet yehoshua")[0].name).toBe("bet yehoshua")
    expect(searchStations("ha shalom")[0].name).toBe("hashalom")
    expect(searchStations("השלום")[0].name).toBe("hashalom")
  })

  test("spelling variants auto-select Bet Yehoshua, while unrelated queries remain unmatched", async () => {
    const api = new FakeDiscord()
    const handler = createHandler(config, api)
    for (const query of ["בית יהושוע", "יהושוע", "ביית יהושוע", "beit yehoshua"]) {
      expect(searchStations(query)[0]?.name).toBe("bet yehoshua")
      const result = await (await handler(signedRequest(modal(query)))).json()
      expect(defaultSelections(result.data)).toEqual(["3400"])
      expect(result.data.content).toContain("בית יהושע")
    }
    expect(searchStations("no such station")).toEqual([])
    expect(searchStations("zzzz")).toEqual([])
    expect(searchStations("xyz")).toEqual([])
    expect(searchStations("netanya")[0]?.name).toBe("netanya")
    expect(api.mutations).toHaveLength(0)
  })

  test("plausible station spelling variants resolve to the intended station", () => {
    const variants: [string, string][] = [
      ["הרצלייה", "herzliya"],
      ["נהרייה", "nahariya"],
      ["קיסרייה", "caesarea pardes hana"],
      ["קרית גת", "kiryat gat"],
      ["קירית גת", "kiryat gat"],
      ["קרית ארייה", "kiryat arye"],
      ["קרית מוצקין", "kiryat motzkin"],
      ["קרית חיים", "kiryat hayim"],
      ["קרית מלאכי", "kiryat malakhi yoav"],
      ["פתח תקוה סגולה", "segula"],
      ["יוקנעם כפר יהושוע", "yokneam kfar yehoshua"],
      ["מזכרת בתייה", "mazkeret batya"],
      ["מרכזית המיפרץ", "hamifrats"],
      ["חוצות המיפרץ", "hutzot hamifratz"],
      ["בניימינה", "binyamina"],
      ["מודיעין מרזכ", "modiin center"],
      ["נתניה ספירר", "netanya sapir"],
      ["באר שבע מרזכ", "beer sheva center"],
      ["herzlia", "herzliya"],
      ["naharia", "nahariya"],
      ["caesaria", "caesarea pardes hana"],
      ["kfar sava", "kfar saba"],
      ["beer sheba center", "beer sheva center"],
      ["bet shemseh", "bet shemesh"],
      ["binyamnia", "binyamina"],
      ["netayna sapir", "netanya sapir"],
      ["hof hacarmel", "hof hakarmel"],
    ]
    const failures = variants
      .filter(([query, expected]) => searchStations(query)[0]?.name !== expected)
      .map(([query, expected]) => ({ query, expected, actual: searchStations(query)[0]?.name ?? null }))
    expect(failures).toEqual([])
  })

  test("removing the last draft favorite allows Finish to clear saved flair", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, hashalomRole)
    const handler = createHandler(config, api)
    const empty = await (
      await handler(signedRequest(interaction(removePrefix + "4600:4600", undefined, stationPicker(["4600"]))))
    ).json()
    expect(defaultSelections(empty.data)).toEqual([])
    expect(JSON.stringify(empty.data)).toContain(finishButton + ":")
    expect(api.mutations).toHaveLength(0)
    await handler(signedRequest(interaction(finishButton + ":", undefined, empty.data)))
    await waitForResponse(api)
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole]))
  })

  test("Back discards unsaved drafts, and reopening preselects saved stations", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, hahaganaRole)
    const handler = createHandler(config, api)
    const draft = await (await handler(signedRequest(interaction(`${selectPrefix}0`, ["4600"], legacyPicker(["4900"]))))).json()
    const back = await (await handler(signedRequest(interaction(backButton, undefined, draft.data)))).json()
    expect(back.type).toBe(7)
    expect(back.data.content).toContain("אייפון או אנדרואיד")
    expect(api.mutations).toHaveLength(0)
    await handler(signedRequest(interaction("conductor:platform:android", undefined, back.data)))
    const reopened = await waitForResponse(api)
    expect(defaultSelections(reopened as ReturnType<typeof stationPicker>)).toEqual(["4900"])
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, androidRole, hahaganaRole]))
  })

  test("deselecting all favorites can clear them; Skip preserves existing favorites", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, hashalomRole)
    const handler = createHandler(config, api)
    await handler(signedRequest(interaction("conductor:skip")))
    await waitForResponse(api)
    expect(api.memberRoles).toContain(hashalomRole)
    const empty = await (await handler(signedRequest(interaction(`${selectPrefix}0`, [], legacyPicker(["4600"]))))).json()
    expect(defaultSelections(empty.data)).toEqual([])
    expect(JSON.stringify(empty.data.components)).toContain("סיום")
    await handler(signedRequest(interaction(finishButton, undefined, empty.data)))
    await waitForResponse(api, 2)
    expect(api.memberRoles).toEqual([staffRole, iosRole])
  })

  test("empty draft remains saveable after another search", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, hashalomRole)
    const handler = createHandler(config, api)
    const empty = await (
      await handler(signedRequest(interaction(removePrefix + "4600:4600", undefined, stationPicker(["4600"]))))
    ).json()
    const searched = await (await handler(signedRequest(modal("does not exist", [], empty.data)))).json()
    expect(JSON.stringify(searched.data.components)).toContain(finishButton + ":")
    await handler(signedRequest(interaction(finishButton + ":", undefined, searched.data)))
    await waitForResponse(api)
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole]))
  })

  test("failed device removal restores the original device and leaves stations and staff untouched", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, hashalomRole)
    api.failRemovalOnce = iosRole
    await expect(new OnboardingRoles(config, api).choose(userId, { kind: "platform", id: "android" })).rejects.toThrow(
      "Removal failed",
    )
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole, hashalomRole]))
  })

  test("failed second station removal restores the original pair", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, hashalomRole, hahaganaRole)
    api.failRemovalOnce = hashalomRole
    await expect(new OnboardingRoles(config, api).choose(userId, { kind: "station", ids: ["2100", "2800"] })).rejects.toThrow(
      "Removal failed",
    )
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole, hashalomRole, hahaganaRole]))
  })

  test("uncertain assignment and removal responses are compensated idempotently", async () => {
    for (const method of ["PUT", "DELETE"]) {
      const api = new FakeDiscord()
      api.memberRoles.push(iosRole, hahaganaRole)
      api.failAfterMutationOnce = { method, roleId: method === "PUT" ? hashalomRole : hahaganaRole }
      await expect(new OnboardingRoles(config, api).choose(userId, { kind: "station", ids: ["4600"] })).rejects.toThrow(
        "Response timed out",
      )
      expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole, hahaganaRole]))
    }
  })

  test("incomplete rollback is reported and remaining compensation still runs", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, hashalomRole, hahaganaRole)
    api.failRemovalOnce = hashalomRole
    api.failAssignmentRole = hahaganaRole
    await expect(new OnboardingRoles(config, api).choose(userId, { kind: "station", ids: ["2100"] })).rejects.toThrow(
      "rollback was incomplete",
    )
    expect(api.memberRoles).not.toContain(hashmonaRole)
    expect(api.memberRoles).toContain(iosRole)
    expect(api.memberRoles).toContain(staffRole)
  })

  test("channel overwrites make a cosmetic role ineligible at setup and runtime", async () => {
    for (const roleId of [iosRole, hashalomRole]) {
      for (const bitset of [
        { allow: "1024", deny: "0" },
        { allow: "0", deny: "2048" },
      ]) {
        const api = new FakeDiscord()
        api.memberRoles.push(androidRole)
        api.channelList[0].permission_overwrites.push({ id: roleId, type: 0, ...bitset })
        const role = api.roleList.find((entry) => entry.id === roleId)!
        const bot = api.roleList.find((entry) => entry.id === botRole)!
        expect(isFlairRole(role, role.name, [bot], api.channelList)).toBe(false)
        await expect(
          new OnboardingRoles(config, api).choose(
            userId,
            roleId === iosRole ? { kind: "platform", id: "ios" } : { kind: "station", ids: ["4600"] },
          ),
        ).rejects.toThrow("That role is unavailable")
        expect(api.mutations).toHaveLength(0)
      }
    }
  })

  test("welcome visibility applies the everyone overwrite to base permissions", () => {
    const everyone: DiscordRole = { id: guildId, name: "@everyone", permissions: "0", managed: false, position: 0 }
    const channel: DiscordChannel = { id: "1548800000000000020", type: 0, permission_overwrites: [] }
    expect(everyoneCanView(channel, everyone)).toBe(false)
    everyone.permissions = "1024"
    expect(everyoneCanView(channel, everyone)).toBe(true)
    channel.permission_overwrites.push({ id: guildId, type: 0, allow: "0", deny: "1024" })
    expect(everyoneCanView(channel, everyone)).toBe(false)
    everyone.permissions = "0"
    channel.permission_overwrites[0] = { id: guildId, type: 0, allow: "1024", deny: "0" }
    expect(everyoneCanView(channel, everyone)).toBe(true)
    channel.permission_overwrites[0].type = 1
    expect(everyoneCanView(channel, everyone)).toBe(false)
    everyone.permissions = "8"
    expect(everyoneCanView(channel, everyone)).toBe(true)
  })

  test("the role layer enforces the two-station limit and rolls back a partially failed assignment", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole, hahaganaRole)
    const roles = new OnboardingRoles(config, api)
    await expect(roles.choose(userId, { kind: "station", ids: ["4600", "4900", "2100"] })).rejects.toBeInstanceOf(StationLimit)
    expect(api.mutations).toHaveLength(0)
    api.failAssignmentRole = hashmonaRole
    await expect(roles.choose(userId, { kind: "station", ids: ["4600", "2100"] })).rejects.toThrow("Assignment failed")
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole, hahaganaRole]))
  })

  test("Finish cannot bypass the device step, even with station selections in the message", async () => {
    const api = new FakeDiscord()
    const handler = createHandler(config, api)
    await handler(signedRequest(interaction(finishButton, undefined, stationPicker(["4600", "4900"]))))
    expect((await waitForResponse(api)).content).toContain("אייפון או אנדרואיד")
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
    await expect(new OnboardingRoles(config, api).choose(userId, { kind: "station", ids: ["4600"] })).rejects.toThrow(
      "Assignment failed",
    )
    expect(new Set(api.memberRoles)).toEqual(new Set([staffRole, iosRole, hahaganaRole]))
  })

  test("a station role with expanded permissions is never assignable", async () => {
    const api = new FakeDiscord()
    api.memberRoles.push(iosRole)
    api.roleList.find((r) => r.id === hashalomRole)!.permissions = "8"
    await expect(new OnboardingRoles(config, api).choose(userId, { kind: "station", ids: ["4600"] })).rejects.toThrow(
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

  test("every station is searchable in both languages; labels and welcome copy are correct", () => {
    expect(stationPicker().components).toHaveLength(1)
    expect(welcomeMessage().content).toContain("לפני שאתם מצטרפים, יש לנו 2 שאלות קצרות")
    for (const station of stations) {
      expect(searchStations(station.name).map((s) => s.id)).toContain(station.id)
      expect(searchStations(station.hebrew).map((s) => s.id)).toContain(station.id)
      const picker = stationPicker([], false, searchStations(station.name))
      const options = (picker.components[0].components[0] as { options: { label: string; description: string }[] }).options
      expect(options.length).toBeLessThanOrEqual(25)
      expect(options.some((option) => option.label === station.name && option.description === station.hebrew)).toBe(true)
    }
    expect(stations.every((s) => /^[a-z0-9 ]+$/.test(s.name))).toBe(true)
    expect(new Set(stations.map((s) => s.name)).size).toBe(stations.length)
  })
})
