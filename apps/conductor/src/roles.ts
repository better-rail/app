import type { ConductorConfig } from "./config"
import type { DiscordApi, DiscordChannel, DiscordMember, DiscordRole } from "./discord"
import { platforms } from "./messages"
import { stations } from "./stations"

export class PlatformRequired extends Error {}
export class StationLimit extends Error {}

export type Selection = { kind: "platform"; id: string } | { kind: "station"; ids: string[] } | { kind: "skip" }

// Renamed roles, or roles later given permissions, are never self-assignable.
// Discord breaks equal-position ties by snowflake: the older role is higher.
export const isBelowRole = (role: DiscordRole, higher: DiscordRole) =>
  role.position < higher.position || (role.position === higher.position && BigInt(role.id) > BigInt(higher.id))

export const isFlairRole = (role: DiscordRole, name: string, botRoles: DiscordRole[], channels: DiscordChannel[]) =>
  role.name === name &&
  role.permissions === "0" &&
  !role.managed &&
  botRoles.some((botRole) => isBelowRole(role, botRole)) &&
  !channels.some((channel) =>
    channel.permission_overwrites.some(
      (overwrite) =>
        overwrite.type === 0 && overwrite.id === role.id && (BigInt(overwrite.allow) !== 0n || BigInt(overwrite.deny) !== 0n),
    ),
  )

export class OnboardingRoles {
  private pending = new Map<string, Promise<unknown>>()

  constructor(
    private config: ConductorConfig,
    private api: DiscordApi,
  ) {}

  async choose(userId: string, selection: Selection) {
    const operation = (this.pending.get(userId) ?? Promise.resolve()).catch(() => {}).then(() => this.update(userId, selection))
    this.pending.set(userId, operation)
    try {
      return await operation
    } finally {
      if (this.pending.get(userId) === operation) this.pending.delete(userId)
    }
  }

  private async update(userId: string, selection: Selection) {
    const guild = `/guilds/${this.config.guildId}`
    const memberPath = `${guild}/members/${userId}`
    const [roles, bot, member, channels] = await Promise.all([
      this.api.call<DiscordRole[]>("GET", `${guild}/roles`),
      this.api.call<DiscordMember>("GET", `${guild}/members/${this.config.applicationId}`),
      this.api.call<DiscordMember>("GET", memberPath),
      this.api.call<DiscordChannel[]>("GET", `${guild}/channels`),
    ])
    const botRoles = roles.filter((role) => bot.roles.includes(role.id))
    const eligible = (choices: readonly { id: string; name: string }[], registry: Record<string, string>) =>
      choices.flatMap((choice) => {
        const role = roles.find((candidate) => candidate.id === registry[choice.id])
        return role && isFlairRole(role, choice.name, botRoles, channels) ? [{ choice, role }] : []
      })

    const platformRoles = eligible(platforms, this.config.platformRoles)
    const stationRoles = eligible(stations, this.config.stationRoles)
    const current = platformRoles.filter(({ role }) => member.roles.includes(role.id))
    if (selection.kind !== "platform" && current.length !== 1) throw new PlatformRequired()
    if (selection.kind === "skip") {
      return {
        platformId: current[0].choice.id,
        stationIds: stationRoles.filter(({ role }) => member.roles.includes(role.id)).map(({ choice }) => choice.id),
      }
    }

    const options = selection.kind === "platform" ? platformRoles : stationRoles
    const ids = selection.kind === "platform" ? [selection.id] : [...new Set(selection.ids)]
    if (selection.kind === "station" && ids.length > 2) throw new StationLimit()
    const targets = ids.map((id) => options.find(({ choice }) => choice.id === id))
    if (targets.some((target) => !target)) throw new Error("That role is unavailable")
    // Record compensation before each request: a timeout can follow a successful mutation.
    const undo: { method: "PUT" | "DELETE"; roleId: string }[] = []
    async function mutate(api: DiscordApi, method: "PUT" | "DELETE", roleId: string) {
      undo.push({ method: method === "PUT" ? "DELETE" : "PUT", roleId })
      await api.call(method, `${memberPath}/roles/${roleId}`)
    }
    try {
      // Add first to preserve the old choice if assignment fails.
      for (const target of targets) {
        if (target && !member.roles.includes(target.role.id)) await mutate(this.api, "PUT", target.role.id)
      }
      for (const { role } of options) {
        if (!targets.some((target) => target?.role.id === role.id) && member.roles.includes(role.id))
          await mutate(this.api, "DELETE", role.id)
      }
    } catch (error) {
      const failures: unknown[] = []
      for (const { method, roleId } of undo.reverse()) {
        await this.api.call(method, `${memberPath}/roles/${roleId}`).catch((rollbackError: unknown) => {
          failures.push(rollbackError)
        })
      }
      if (failures.length) throw new AggregateError([error, ...failures], "Role update failed and rollback was incomplete")
      throw error
    }
    return {
      platformId: selection.kind === "platform" ? selection.id : current[0].choice.id,
      stationIds:
        selection.kind === "station"
          ? ids
          : stationRoles.filter(({ role }) => member.roles.includes(role.id)).map(({ choice }) => choice.id),
    }
  }
}
