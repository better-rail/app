import type { ConductorConfig } from "./config"
import type { DiscordApi, DiscordChannel, DiscordMessage } from "./discord"
import { isEmailHeader, REPLY_SENT_PREFIX, RESOLVED_PREFIX } from "./email-bridge"
import { FORUM_CHANNEL, findStatusTag } from "./feedback-status"

const NUDGE_AFTER_MS = 48 * 60 * 60 * 1000
const NUDGE_MESSAGE = "@here This email has been waiting 48 hours for a reply."

const snowflakeTime = (id: string) => Number((BigInt(id) >> 22n) + 1420070400000n)

/** When the oldest email since our last reply or resolve arrived, or undefined when there is none or it was already nudged. */
function waitingSince(messages: DiscordMessage[], applicationId: string) {
  let since: number | undefined
  // Discord lists messages newest first.
  for (const message of messages) {
    if (!message.author?.bot || message.author.id !== applicationId) continue
    if (message.content.startsWith(NUDGE_MESSAGE)) return undefined
    if (message.content.startsWith(REPLY_SENT_PREFIX) || message.content.startsWith(RESOLVED_PREFIX)) break
    if (isEmailHeader(message.content)) since = snowflakeTime(message.id)
  }
  return since
}

/** Pings `@here` once in every Open forum post whose email has gone 48 hours without a reply. */
export async function nudgeUnansweredEmails(config: ConductorConfig, api: DiscordApi) {
  const now = Date.now()
  const forumId = config.emailFeedbackChannelId
  if (!forumId) return
  const forum = await api.call<DiscordChannel>("GET", `/channels/${forumId}`)
  const openTag = forum.type === FORUM_CHANNEL ? findStatusTag(forum, "open") : undefined
  if (!openTag) return

  // Closed posts drop out; Discord archives an idle post only after 7 days.
  const { threads } = await api.call<{ threads: DiscordChannel[] }>("GET", `/guilds/${config.guildId}/threads/active`)
  const candidates = threads.filter(
    (thread) =>
      thread.parent_id === forumId &&
      thread.applied_tags?.includes(openTag.id) &&
      now - snowflakeTime(thread.id) >= NUDGE_AFTER_MS,
  )

  let failure: unknown
  for (const thread of candidates) {
    try {
      const messages = await api.call<DiscordMessage[]>("GET", `/channels/${thread.id}/messages?limit=100`)
      const since = waitingSince(messages, config.applicationId)
      if (since === undefined || now - since < NUDGE_AFTER_MS) continue
      await api.call("POST", `/channels/${thread.id}/messages`, {
        content: NUDGE_MESSAGE,
        allowed_mentions: { parse: ["everyone"] },
      })
    } catch (error) {
      console.warn(`Conductor: could not nudge thread ${thread.id}:`, (error as Error).message)
      failure ??= error
    }
  }
  if (failure) throw failure
}
