export type ConductorConfig = {
  applicationId: string
  publicKey: string
  botToken: string
  guildId: string
  stationRoles: Record<string, string>
  platformRoles: Record<string, string>
}

export const isSnowflake = (value: unknown): value is string => typeof value === "string" && /^\d{17,20}$/.test(value)

export function loadConfig(environment = process.env): ConductorConfig {
  const applicationId = environment.DISCORD_APPLICATION_ID || ""
  const publicKey = environment.DISCORD_PUBLIC_KEY || ""
  const botToken = environment.DISCORD_BOT_TOKEN || ""
  const guildId = environment.DISCORD_GUILD_ID || ""
  if (!isSnowflake(applicationId) || !isSnowflake(guildId)) throw new Error("Set the Discord application and guild IDs")
  if (!/^[a-f0-9]{64}$/i.test(publicKey)) throw new Error("Set the Discord application public key")
  if (!botToken) throw new Error("Set DISCORD_BOT_TOKEN")
  const stationRoles = parseRegistry(environment.DISCORD_STATION_ROLES || "{}")
  const platformRoles = parseRegistry(environment.DISCORD_PLATFORM_ROLES || "{}")
  const allRoleIds = [...Object.values(stationRoles), ...Object.values(platformRoles)]
  if (new Set(allRoleIds).size !== allRoleIds.length) throw new Error("Platform and station roles must be distinct")
  return { applicationId, publicKey, botToken, guildId, stationRoles, platformRoles }
}

function parseRegistry(value: string): Record<string, string> {
  const registry: unknown = JSON.parse(value)
  if (
    !registry ||
    Array.isArray(registry) ||
    typeof registry !== "object" ||
    Object.values(registry).some((role) => !isSnowflake(role)) ||
    new Set(Object.values(registry)).size !== Object.keys(registry).length
  ) {
    throw new Error("Role registries must map choices to unique Discord role IDs")
  }
  return registry as Record<string, string>
}
