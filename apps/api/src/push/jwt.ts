/**
 * jwt.ts — the JSON Web Tokens the push clients authenticate with, on WebCrypto.
 *
 * APNs takes an ES256 provider token and Google's OAuth2 endpoint an RS256
 * assertion. The Bun server got both from `fast-jwt`/`firebase-admin`, which
 * lean on Node's crypto; a Worker has only `crypto.subtle`, so this is the
 * minimum needed to import a PKCS#8 PEM and sign a compact JWT with it.
 */

export type JwtAlgorithm = "ES256" | "RS256"

const encoder = new TextEncoder()

// Taken from SubtleCrypto itself: the DOM lib and workers-types name these parameter types differently.
type ImportParams = Parameters<SubtleCrypto["importKey"]>[2]
type SignParams = Parameters<SubtleCrypto["sign"]>[0]

const IMPORT_PARAMS: Record<JwtAlgorithm, ImportParams> = {
  ES256: { name: "ECDSA", namedCurve: "P-256" },
  RS256: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
}

const SIGN_PARAMS: Record<JwtAlgorithm, SignParams> = {
  // WebCrypto's ECDSA signature is the raw r||s concatenation that JWS (and so APNs) expects, not DER.
  ES256: { name: "ECDSA", hash: "SHA-256" },
  RS256: { name: "RSASSA-PKCS1-v1_5" },
}

const toBytes = (data: ArrayBuffer | Uint8Array | string) => {
  if (typeof data === "string") return encoder.encode(data)
  return data instanceof Uint8Array ? data : new Uint8Array(data)
}

/** Standard base64 of raw bytes (`btoa` wants a binary string, built in chunks to stay under the argument limit). */
const base64 = (bytes: Uint8Array) => {
  let binary = ""
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

/** base64url (RFC 4648 §5, unpadded) of a string or bytes. */
export const base64url = (data: ArrayBuffer | Uint8Array | string) =>
  base64(toBytes(data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

/** The bytes behind a base64url string. */
export const base64urlDecode = (text: string) => {
  const padded = text
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(text.length / 4) * 4, "=")
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

/** The DER bytes inside a PEM block (any `-----BEGIN ...-----` label; the body is base64). */
export const pemToDer = (pem: string) => {
  const body = pem.replace(/-----(BEGIN|END)[^-]*-----/g, "").replace(/\s+/g, "")
  return Uint8Array.from(atob(body), (char) => char.charCodeAt(0))
}

/** Imports a PKCS#8 (`-----BEGIN PRIVATE KEY-----`) PEM as a signing key for the given JWT algorithm. */
export const importPrivateKey = (pem: string, algorithm: JwtAlgorithm) => {
  const der = pemToDer(pem)
  if (der.length === 0) throw new Error(`Empty ${algorithm} private key`)
  return crypto.subtle.importKey("pkcs8", der, IMPORT_PARAMS[algorithm], false, ["sign"])
}

/** A compact JWS: `base64url(header).base64url(payload).base64url(signature)`. */
export const signJwt = async (
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  key: CryptoKey,
  algorithm: JwtAlgorithm,
) => {
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const signature = await crypto.subtle.sign(SIGN_PARAMS[algorithm], key, encoder.encode(signingInput))
  return `${signingInput}.${base64url(signature)}`
}
