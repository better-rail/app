import type { DiscordChannel } from "./discord"

export const FORUM_CHANNEL = 15

// Forum tags matched by name, so a renamed tag stops being tracked.
export const feedbackStatuses = [
  { id: "open", name: "Open", emoji: "🔴" },
  { id: "replied", name: "Replied", emoji: "🟡" },
  { id: "resolved", name: "Resolved", emoji: "🟢" },
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

/** The forum's `available_tags` with every status tag present and wearing its emoji, or null when nothing changes. */
export function syncedStatusTags(forum: DiscordChannel) {
  const existing = forum.available_tags ?? []
  let changed = false
  const tags = existing.map((tag) => {
    const status = feedbackStatuses.find((s) => s.name.toLowerCase() === tag.name.toLowerCase())
    if (!status || tag.emoji_name === status.emoji) return tag
    changed = true
    return { ...tag, emoji_id: null, emoji_name: status.emoji }
  })
  const missing = feedbackStatuses
    .filter((status) => !existing.some((tag) => tag.name.toLowerCase() === status.name.toLowerCase()))
    .map((status) => ({ name: status.name, emoji_name: status.emoji }))
  return changed || missing.length ? [...tags, ...missing] : null
}
