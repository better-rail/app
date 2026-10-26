import type { DiscordChannel } from "./discord"

export const FORUM_CHANNEL = 15

// Forum tags matched by name, so a renamed tag stops being tracked.
export const feedbackStatuses = [
  { id: "open", name: "Open", emoji: "📬" },
  { id: "replied", name: "Replied", emoji: "✉️" },
  { id: "resolved", name: "Resolved", emoji: "✅" },
] as const

export type FeedbackStatus = (typeof feedbackStatuses)[number]["id"]

const isStatusName = (name: string, status?: FeedbackStatus) =>
  feedbackStatuses.some((s) => (!status || s.id === status) && s.name.toLowerCase() === name.toLowerCase())

/** The thread's tags with its status swapped for `status`, keeping any other tags; undefined if the forum lacks the tag. */
export function statusTags(forum: DiscordChannel, applied: string[], status: FeedbackStatus): string[] | undefined {
  const tags = forum.available_tags ?? []
  const target = tags.find((tag) => isStatusName(tag.name, status))
  if (!target) return undefined
  const statusIds = new Set(tags.filter((tag) => isStatusName(tag.name)).map((tag) => tag.id))
  // Discord allows five tags per post.
  return [target.id, ...applied.filter((id) => !statusIds.has(id))].slice(0, 5)
}

/** The status tags the forum is missing, ready to append to its `available_tags`. */
export function missingStatusTags(forum: DiscordChannel) {
  const names = (forum.available_tags ?? []).map((tag) => tag.name.toLowerCase())
  return feedbackStatuses
    .filter((status) => !names.includes(status.name.toLowerCase()))
    .map((status) => ({ name: status.name, emoji_name: status.emoji }))
}
