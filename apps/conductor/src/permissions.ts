import type { DiscordChannel, DiscordRole } from "./discord"

// @everyone is the complete base role set for an ordinary member who just joined.
export function everyoneCanView(channel: DiscordChannel, everyone: DiscordRole) {
  let permissions = BigInt(everyone.permissions)
  if ((permissions & 8n) !== 0n) return true
  const overwrite = channel.permission_overwrites.find((entry) => entry.type === 0 && entry.id === everyone.id)
  if (overwrite) permissions = (permissions & ~BigInt(overwrite.deny)) | BigInt(overwrite.allow)
  return (permissions & 1024n) !== 0n
}
