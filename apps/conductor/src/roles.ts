import type { ConductorConfig } from "./config"
import type { DiscordApi, DiscordMember, DiscordRole } from "./discord"
import { platforms } from "./messages"
import { stations } from "./stations"

export class PlatformRequired extends Error {}

export type Selection = { kind: "platform"; id: string } | { kind: "station"; id?: string } | { kind: "skip" }

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
    const current = platformRoles.filter(({ role }) => member.roles.includes(role.id))
    if (selection.kind !== "platform" && current.length !== 1) throw new PlatformRequired()
    if (selection.kind === "skip") return current[0].choice.id

    const options = selection.kind === "platform" ? platformRoles : eligible(stations, this.config.stationRoles)
    const target = selection.id ? options.find(({ choice }) => choice.id === selection.id) : undefined
    if (selection.id && !target) throw new Error("That role is unavailable")
    // Add first so a failed assignment never removes the member's old choice.
    if (target && !member.roles.includes(target.role.id)) await this.api.call("PUT", `${memberPath}/roles/${target.role.id}`)
    for (const { role } of options) {
      if (role.id !== target?.role.id && member.roles.includes(role.id))
        await this.api.call("DELETE", `${memberPath}/roles/${role.id}`)
    }
    return selection.kind === "platform" ? selection.id : current[0].choice.id
  }
}
