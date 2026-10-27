import type { ConductorConfig } from "./config"
import type { DiscordApi } from "./discord"

const MANAGE_MESSAGES = "8192"

export const guildCommands = [
  {
    name: "reply",
    description: "Reply directly to the customer via email",
    default_member_permissions: MANAGE_MESSAGES,
    options: [{ name: "message", description: "The message to send to the customer", type: 3, required: true }],
  },
  {
    name: "resolve",
    description: "Mark this feedback as resolved and close its thread",
    default_member_permissions: MANAGE_MESSAGES,
  },
]

/** Replaces the guild's commands with `guildCommands`; unchanged commands are left as they are. */
export async function registerCommands(config: ConductorConfig, api: DiscordApi) {
  await api.call("PUT", `/applications/${config.applicationId}/guilds/${config.guildId}/commands`, guildCommands)
}
