export type DiscordRole = { id: string; name: string; permissions: string; position: number; managed: boolean }
export type DiscordOverwrite = { id: string; type: number; allow: string; deny: string }
export type DiscordChannel = {
  id: string
  guild_id?: string
  parent_id?: string
  name?: string
  type: number
  permission_overwrites: DiscordOverwrite[]
  thread_metadata?: { archived?: boolean; auto_archive_duration?: number }
}
export type DiscordMember = { roles: string[] }
export type DiscordAttachment = {
  id: string
  filename: string
  size?: number
  url?: string
  content_type?: string
}
export type DiscordMessage = {
  id: string
  channel_id: string
  content: string
  author?: { id: string; username: string; bot?: boolean }
  attachments?: DiscordAttachment[]
}

export class DiscordApi {
  constructor(private botToken: string) {}

  async call<T>(method: string, path: string, body?: unknown, authenticate = true): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      const isFormData = typeof FormData !== "undefined" && body instanceof FormData
      const response = await fetch(`https://discord.com/api/v10${path}`, {
        method,
        headers: {
          ...(!isFormData && body !== undefined && { "Content-Type": "application/json" }),
          ...(authenticate && { Authorization: `Bot ${this.botToken}` }),
        },
        body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
        signal: AbortSignal.timeout(10_000),
      })
      if (response.status === 429 && attempt < 5) {
        const seconds = Number(((await response.json()) as { retry_after?: number }).retry_after)
        if (!(seconds <= 10)) throw new Error("Discord is busy; try again shortly")
        await Bun.sleep(Math.max(100, seconds * 1000))
        continue
      }
      if (!response.ok) {
        const { message } = (await response.json().catch(() => ({}))) as { message?: string }
        throw new Error(`Discord ${method} failed (${response.status}${message ? `: ${message}` : ""})`)
      }
      return (response.status === 204 ? undefined : await response.json()) as T
    }
  }
}
