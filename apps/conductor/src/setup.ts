import { isSnowflake, loadConfig } from "./config"
import { DiscordApi, type DiscordMember, type DiscordRole } from "./discord"
import { platforms, welcomeMessage } from "./messages"
import { isFlairRole } from "./roles"
import { stations } from "./stations"

const config = loadConfig()
const channelId = process.env.DISCORD_CHANNEL_ID
if (!isSnowflake(channelId)) throw new Error("Set DISCORD_CHANNEL_ID to the public welcome channel")
const api = new DiscordApi(config.botToken)
const guild = `/guilds/${config.guildId}`
const bot = await api.call<{ id: string }>("GET", "/users/@me")
if (bot.id !== config.applicationId) throw new Error("The token does not belong to the configured application")
const channel = await api.call<{ guild_id: string; type: number; permission_overwrites: { id: string; deny: string }[] }>(
  "GET",
  `/channels/${channelId}`,
)
if (channel.guild_id !== config.guildId || channel.type !== 0) throw new Error("Choose a text channel in the Better Rail server")
if (
  channel.permission_overwrites.some((overwrite) => overwrite.id === config.guildId && (BigInt(overwrite.deny) & 1024n) !== 0n)
) {
  throw new Error("The welcome channel must be visible to everyone")
}
const allRoles = await api.call<DiscordRole[]>("GET", `${guild}/roles`)
const botMember = await api.call<DiscordMember>("GET", `${guild}/members/${bot.id}`)
const botRoles = allRoles.filter((role) => botMember.roles.includes(role.id))
if (!botRoles.some((role) => (BigInt(role.permissions) & 268435456n) !== 0n)) throw new Error("The bot needs Manage Roles")

async function provision(choices: readonly { id: string; name: string }[], registry: Record<string, string>) {
  const result: Record<string, string> = {}
  for (const choice of choices) {
    const existing =
      allRoles.find((role) => role.id === registry[choice.id]) ?? allRoles.find((role) => role.name === choice.name)
    if (existing && !isFlairRole(existing, choice.name, botRoles)) {
      throw new Error(`Cannot use role "${choice.name}"; it must be permissionless and below The Conductor`)
    }
    if (existing) result[choice.id] = existing.id
    else {
      result[choice.id] = (await api.call<DiscordRole>("POST", `${guild}/roles`, { name: choice.name, permissions: "0" })).id
      console.info(`Created flair role: ${choice.name}`)
    }
  }
  return result
}

const platformRoles = await provision(platforms, config.platformRoles)
const stationRoles = await provision(stations, config.stationRoles)

const setupFile = Bun.file(".conductor-setup.json")
const previous = (await setupFile.exists()) ? await setupFile.json() : {}
const messageId =
  process.env.DISCORD_PICKER_MESSAGE_ID ||
  (previous.applicationId === config.applicationId && previous.channelId === channelId ? previous.messageId : undefined)
if (messageId && !isSnowflake(messageId)) throw new Error("Invalid welcome message ID")
const message = await api.call<{ id: string }>(
  messageId ? "PATCH" : "POST",
  `/channels/${channelId}/messages${messageId ? `/${messageId}` : ""}`,
  welcomeMessage(),
)
await Bun.write(
  setupFile,
  JSON.stringify({ applicationId: config.applicationId, channelId, messageId: message.id, platformRoles, stationRoles }, null, 2),
)
console.info(`Welcome message: https://discord.com/channels/${config.guildId}/${channelId}/${message.id}`)
console.info(
  "Copy platformRoles and stationRoles from .conductor-setup.json into DISCORD_PLATFORM_ROLES and DISCORD_STATION_ROLES.",
)
