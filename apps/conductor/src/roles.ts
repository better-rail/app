import type { ConductorConfig } from "./config"
import type { DiscordApi, DiscordMember, DiscordRole } from "./discord"
import { platforms } from "./messages"
import { stations } from "./stations"

export class PlatformRequired extends Error {}
export class StationLimit extends Error {}

export type Selection = { kind: "platform"; id: string } | { kind: "station"; ids: string[] } | { kind: "skip" }

// Renamed roles, or roles later given permissions, are never self-assignable.
// Discord breaks equal-position ties by snowflake: the older role is higher.
export const isBelowRole = (role: DiscordRole, higher: DiscordRole) =>
  role.position < higher.position || (role.position === higher.position && BigInt(role.id) > BigInt(higher.id))

export const isFlairRole = (role: DiscordRole, name: string, botRoles: DiscordRole[]) =>
  role.name === name && role.permissions === "0" && !role.managed && botRoles.some((botRole) => isBelowRole(role, botRole))

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
    const [roles, bot, member] = await Promise.all([
      this.api.call<DiscordRole[]>("GET", `${guild}/roles`),
      this.api.call<DiscordMember>("GET", `${guild}/members/${this.config.applicationId}`),
      this.api.call<DiscordMember>("GET", memberPath),
    ])
    const botRoles = roles.filter((role) => bot.roles.includes(role.id))
    const eligible = (choices: readonly { id: string; name: string }[], registry: Record<string, string>) =>
      choices.flatMap((choice) => {
        const role = roles.find((candidate) => candidate.id === registry[choice.id])
        return role && isFlairRole(role, choice.name, botRoles) ? [{ choice, role }] : []
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
    // Add first so a failed assignment never removes the member's old choice.
    const added: string[] = []
    try {
      for (const target of targets) {
        if (target && !member.roles.includes(target.role.id)) {
          await this.api.call("PUT", `${memberPath}/roles/${target.role.id}`)
          added.push(target.role.id)
        }
      }
    } catch (error) {
      for (const roleId of added) {
        await this.api.call("DELETE", `${memberPath}/roles/${roleId}`).catch(() => {
          console.error("Conductor: could not roll back an incomplete station assignment")
        })
      }
      throw error
    }
    for (const { role } of options) {
      if (!targets.some((target) => target?.role.id === role.id) && member.roles.includes(role.id))
        await this.api.call("DELETE", `${memberPath}/roles/${role.id}`)
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
