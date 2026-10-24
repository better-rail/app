import { concatBytes } from "./bytes"

// What Bun.serve's maxRequestBodySize allowed; interactions and webhook events are a few KB.
export const MAX_REQUEST_BODY_BYTES = 64_000

/** Buffers the body up to the limit; a larger one, declared or streamed, gets a 413 instead of reaching the handler. */
export async function limitRequestBody(request: Request, limit = MAX_REQUEST_BODY_BYTES): Promise<Request | Response> {
  const tooLarge = () => new Response("Payload too large", { status: 413 })
  if (Number(request.headers.get("content-length")) > limit) return tooLarge()
  if (!request.body) return request
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      return tooLarge()
    }
    chunks.push(value)
  }
  return new Request(request, { body: concatBytes(...chunks) })
}
