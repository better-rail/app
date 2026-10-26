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

export const findStatusTag = (forum: DiscordChannel, status: FeedbackStatus) =>
  forum.available_tags?.find((tag) => isStatusName(tag.name, status))

/** The thread's tags with its status swapped for `status`, keeping every other tag; throws when that can't be done. */
export function statusTags(forum: DiscordChannel, applied: string[], status: FeedbackStatus): string[] {
  const target = findStatusTag(forum, status)
  if (!target) throw new Error(`the forum has no "${status}" status tag; run setup to add it`)
  const statusIds = new Set((forum.available_tags ?? []).filter((tag) => isStatusName(tag.name)).map((tag) => tag.id))
  const others = applied.filter((id) => !statusIds.has(id))
  // Discord allows five tags per post.
  if (others.length >= 5) throw new Error("the post already has five other tags; remove one to make room for its status")
  return [target.id, ...others]
}

/** The status tags the forum is missing, ready to append to its `available_tags`. */
export function missingStatusTags(forum: DiscordChannel) {
  const names = (forum.available_tags ?? []).map((tag) => tag.name.toLowerCase())
  return feedbackStatuses
    .filter((status) => !names.includes(status.name.toLowerCase()))
    .map((status) => ({ name: status.name, emoji_name: status.emoji }))
}
