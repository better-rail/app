/**
 * apns-token-do.ts — the one APNs provider token for the whole deployment.
 *
 * Apple accepts a provider token for an hour and treats every freshly signed
 * token from the same key as a "token update", of which it allows one per 20
 * minutes; more and every push fails with TooManyProviderTokenUpdates. A
 * Worker is many isolates (each ride's Durable Object may run in its own),
 * so minting per isolate is minting far too often. This singleton object
 * signs the token once and hands the same one to every isolate until it is
 * 50 minutes old, which is what the single Bun process on Railway did.
 */
import { DurableObject } from "cloudflare:workers"

import { config } from "../config"
import { logNames, logger } from "../logs"
import { bindRuntime, type Env } from "../runtime"
import { mintProviderToken, TOKEN_LIFETIME_MS } from "./apns-token"

type StoredToken = { token: string; issuedAt: number; teamId: string; keyId: string }

export class ApnsTokenDO extends DurableObject<Env> {
  private minting: Promise<string> | undefined

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    bindRuntime(env)
  }

  /** The current provider token; signed afresh only when the stored one is 50 minutes old or signed with another key. */
  async token(): Promise<string> {
    const stored = await this.ctx.storage.get<StoredToken>("token")
    if (stored && this.isCurrent(stored)) return stored.token
    return this.mint()
  }

  /**
   * The token after Apple rejected `rejected` (ExpiredProviderToken, InvalidProviderToken). Signs a new one only if
   * `rejected` is still the stored token, so a burst of failed pushes rotates once, not once each.
   */
  async rotate(rejected: string): Promise<string> {
    const stored = await this.ctx.storage.get<StoredToken>("token")
    if (stored && stored.token !== rejected && this.isCurrent(stored)) return stored.token
    return this.mint()
  }

  private isCurrent(stored: StoredToken) {
    return (
      stored.teamId === config.appleTeamId &&
      stored.keyId === config.appleKeyId &&
      Date.now() - stored.issuedAt < TOKEN_LIFETIME_MS
    )
  }

  // Concurrent callers during a mint share it; a failed mint (bad PEM) is not stored.
  private mint(): Promise<string> {
    this.minting ??= (async () => {
      try {
        const { appleTeamId: teamId, appleKeyId: keyId, appleKeyContent } = config
        const issuedAt = Date.now()
        const token = await mintProviderToken(teamId, keyId, appleKeyContent, issuedAt)
        await this.ctx.storage.put<StoredToken>("token", { token, issuedAt, teamId, keyId })
        logger.info(logNames.notifications.apnTokenMinted, { keyId })
        return token
      } finally {
        this.minting = undefined
      }
    })()
    return this.minting
  }
}
