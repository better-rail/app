import type { DiscordChannel, DiscordRole } from "./discord"

// @everyone is the complete base role set for an ordinary member who just joined.
export function everyoneCanReadWelcome(channel: DiscordChannel, everyone: DiscordRole) {
  let permissions = BigInt(everyone.permissions)
  if ((permissions & 8n) !== 0n) return true
  const overwrite = channel.permission_overwrites.find((entry) => entry.type === 0 && entry.id === everyone.id)
  if (overwrite) permissions = (permissions & ~BigInt(overwrite.deny)) | BigInt(overwrite.allow)
  const required = 1024n | 65536n // View Channel and Read Message History.
  return (permissions & required) === required
}

// After HTTP channel obfuscation starts, only Administrator proves that no
// hidden channels were omitted. View Channel alone can be denied by overwrites.
// https://docs.discord.com/developers/change-log#channel-obfuscation-for-users-and-bots
export function requireCompleteChannelAudit(botRoles: DiscordRole[], now = Date.now()) {
  if (now >= Date.UTC(2026, 10, 16) && !botRoles.some((role) => (BigInt(role.permissions) & 8n) !== 0n)) {
    throw new Error("Role changes disabled: Discord no longer guarantees a complete channel audit for this bot")
  }
}
