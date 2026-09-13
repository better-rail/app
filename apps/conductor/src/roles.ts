import type { ConductorConfig } from "./config"
import { DiscordApi, type DiscordMember, type DiscordRole } from "./discord"
import { platforms } from "./messages"
import { stations } from "./stations"

export class PlatformRequired extends Error {}

// Only explicitly provisioned, permissionless roles below the bot are eligible.
// Renamed roles or roles subsequently given permissions cannot be self-assigned.
export function safeRoles(
  roles: DiscordRole[],
  registry: Record<string, string>,
  choices: readonly { id: string; name: string }[],
  botPosition: number,
) {
  return choices.flatMap((choice) => {
    const role = roles.find((candidate) => candidate.id === registry[choice.id])
    return role && role.name === choice.name && role.permissions === "0" && !role.managed && role.position < botPosition
      ? [{ choice, role }]
      : []
  })
}

export type Selection = { kind: "platform"; id: string } | { kind: "station"; id?: string } | { kind: "skip" }

export class OnboardingRoles {
  private pending = new Map<string, Promise<unknown>>()

  constructor(
    private config: ConductorConfig,
    private api: DiscordApi,
  ) {}

  async choose(userId: string, selection: Selection) {
    const previous = this.pending.get(userId) || Promise.resolve()
    const operation = previous.catch(() => {}).then(() => this.update(userId, selection))
    this.pending.set(userId, operation)
    try {
      return await operation
    } finally {
      if (this.pending.get(userId) === operation) this.pending.delete(userId)
    }
  }

  private async update(userId: string, selection: Selection) {
    const guild = `/guilds/${this.config.guildId}`
    const roles = await this.api.call<DiscordRole[]>("GET", `${guild}/roles`)
    const bot = await this.api.call<{ id: string }>("GET", "/users/@me")
    const botMember = await this.api.call<DiscordMember>("GET", `${guild}/members/${bot.id}`)
    const botPosition = Math.max(0, ...roles.filter((role) => botMember.roles.includes(role.id)).map((role) => role.position))
    const platformRoles = safeRoles(roles, this.config.platformRoles, platforms, botPosition)
    const stationRoles = safeRoles(roles, this.config.stationRoles, stations, botPosition)
    const memberPath = `${guild}/members/${userId}`
    const member = await this.api.call<DiscordMember>("GET", memberPath)
    const currentPlatform = platformRoles.filter(({ role }) => member.roles.includes(role.id))
    if (selection.kind !== "platform" && currentPlatform.length !== 1) throw new PlatformRequired("Choose a device first")
    if (selection.kind === "skip") return currentPlatform[0].choice.id
    const eligible = selection.kind === "platform" ? platformRoles : stationRoles
    const target = selection.id ? eligible.find(({ choice }) => choice.id === selection.id) : undefined
    if (selection.id && !target) throw new Error("That role is unavailable")
    // Add first so a failed assignment never removes the member's old choice.
    if (target && !member.roles.includes(target.role.id)) await this.api.call("PUT", `${memberPath}/roles/${target.role.id}`)
    for (const { role } of eligible) {
      if (member.roles.includes(role.id) && role.id !== target?.role.id)
        await this.api.call("DELETE", `${memberPath}/roles/${role.id}`)
    }
    return selection.kind === "platform" ? selection.id : currentPlatform[0].choice.id
  }
}
