// Byte helpers shared by the signature checks and the email formatter; web-standard only, so they run on Workers and Bun alike.
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const byteLength = (text: string) => encoder.encode(text).length

// TextEncoder always allocates a fresh ArrayBuffer; the cast says so where the runtime types leave it open.
export const encodeUtf8 = (text: string) => encoder.encode(text) as Uint8Array<ArrayBuffer>

export const decodeUtf8 = (bytes: Uint8Array) => decoder.decode(bytes)

export function concatBytes(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

/** Decodes a hex string; undefined when it is not one (odd length or stray characters). */
export function fromHex(hex: string): Uint8Array<ArrayBuffer> | undefined {
  if (hex.length % 2 || !/^[0-9a-f]*$/i.test(hex)) return undefined
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index++) bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  return bytes
}

/** Decodes standard base64; throws on malformed input, like atob. */
export function fromBase64(base64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}
