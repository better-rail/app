/**
 * apns-token.ts — signing the APNs provider token, shared by the client and the
 * token authority. Kept free of Worker-only imports so `bun test` can load the
 * client (the authority itself needs `cloudflare:workers`).
 */
import { importPrivateKey, signJwt } from "./jwt"

/** The authority's one instance (`idFromName`). */
export const APNS_TOKEN_NAME = "apns"

// Apple accepts a provider token for up to an hour, and asks that it isn't refreshed more than every 20 minutes.
export const TOKEN_LIFETIME_MS = 50 * 60 * 1000

export const mintProviderToken = async (teamId: string, keyId: string, keyContent: string, nowMs = Date.now()) => {
  const key = await importPrivateKey(keyContent, "ES256")
  return signJwt({ alg: "ES256", kid: keyId }, { iss: teamId, iat: Math.floor(nowMs / 1000) }, key, "ES256")
}
