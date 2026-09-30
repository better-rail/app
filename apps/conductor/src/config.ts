export const SUPPORT_EMAIL_FROM = "Better Rail <feedback@better-rail.co.il>"

export type ConductorConfig = {
  applicationId: string
  publicKey: string
  botToken: string
  guildId: string
  platformRoles: Record<string, string>
  resendApiKey?: string
  resendWebhookSecret?: string
  emailFeedbackChannelId?: string
}

export const isSnowflake = (value: unknown): value is string => typeof value === "string" && /^\d{17,20}$/.test(value)

export function loadConfig(): ConductorConfig {
  const env = process.env
  const applicationId = env.DISCORD_APPLICATION_ID
  const guildId = env.DISCORD_GUILD_ID
  const publicKey = env.DISCORD_PUBLIC_KEY ?? ""
  const botToken = env.DISCORD_BOT_TOKEN
  if (!isSnowflake(applicationId) || !isSnowflake(guildId)) throw new Error("Set the Discord application and guild IDs")
  if (!/^[a-f0-9]{64}$/i.test(publicKey)) throw new Error("Set the Discord application public key")
  if (!botToken) throw new Error("Set DISCORD_BOT_TOKEN")
  return {
    applicationId,
    guildId,
    publicKey,
    botToken,
    platformRoles: JSON.parse(env.DISCORD_PLATFORM_ROLES || "{}"),
    resendApiKey: env.RESEND_API_KEY,
    resendWebhookSecret: env.RESEND_WEBHOOK_SECRET,
    emailFeedbackChannelId: env.DISCORD_EMAIL_FEEDBACK_CHANNEL_ID,
  }
}
