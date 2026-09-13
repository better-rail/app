export type DiscordRole = { id: string; name: string; permissions: string; position: number; managed: boolean }
export type DiscordMember = { roles: string[] }

export class DiscordApi {
  constructor(
    private botToken: string,
    private request: typeof fetch = fetch,
  ) {}

  async call<T>(method: string, path: string, body?: unknown, authenticate = true): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await this.request(`https://discord.com/api/v10${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(authenticate ? { Authorization: `Bot ${this.botToken}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10_000),
      })
      if (response.status === 429 && attempt < 4) {
        const rateLimit = (await response.json()) as { retry_after?: number }
        const seconds = Number(rateLimit.retry_after)
        if (!Number.isFinite(seconds) || seconds < 0 || seconds > 10) throw new Error("Discord is busy; try again shortly")
        await Bun.sleep(Math.max(100, seconds * 1000))
        continue
      }
      if (!response.ok) throw new Error(`Discord request failed (${response.status})`)
      return (response.status === 204 ? undefined : await response.json()) as T
    }
    throw new Error("Discord is busy; try again shortly")
  }
}
