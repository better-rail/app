import { concatBytes, encodeUtf8, fromBase64 } from "./bytes"

export type ResendEmailReceivedEvent = {
  type: string
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject?: string
    message_id?: string
    attachments?: Array<{
      id: string
      filename: string
      content_type: string
      size?: number
      download_url?: string
    }>
  }
}

export type ResendReceivedAttachment = {
  id: string
  filename: string
  size: number
  content_type: string
  download_url?: string
  expires_at?: string
}

export type ResendReceivedEmail = {
  id: string
  from: string
  to: string[]
  subject?: string
  html?: string
  text?: string
  headers?: Record<string, string | string[]>
  message_id?: string
  attachments?: Array<{
    id: string
    filename: string
    content_type: string
    size?: number
    download_url?: string
  }>
}

export type ResendSendEmailOptions = {
  from: string
  to: string[]
  subject: string
  text: string
  html?: string
  reply_to?: string
  headers?: Record<string, string>
  attachments?: Array<{
    filename: string
    content: string // base64, or plain text
  }>
}

export function parseSvixSecret(secret: string): Uint8Array<ArrayBuffer> {
  if (secret.startsWith("whsec_")) {
    return fromBase64(secret.slice(6))
  }
  return encodeUtf8(secret)
}

export async function verifyResendSignature(request: Request, body: Uint8Array, secret: string): Promise<boolean> {
  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")
  if (!svixId || !svixTimestamp || !svixSignature) return false

  const timestampNum = Number(svixTimestamp)
  if (Number.isNaN(timestampNum)) return false
  if (Math.abs(Date.now() / 1000 - timestampNum) > 300) return false

  const toSign = concatBytes(encodeUtf8(`${svixId}.${svixTimestamp}.`), body)
  try {
    const key = await crypto.subtle.importKey("raw", parseSvixSecret(secret), { name: "HMAC", hash: "SHA-256" }, false, [
      "verify",
    ])
    for (const item of svixSignature.split(" ")) {
      const [version, signature] = item.split(",")
      if (version !== "v1" || !signature) continue
      // WebCrypto compares the HMAC in constant time
      if (await crypto.subtle.verify("HMAC", key, fromBase64(signature), toSign)) return true
    }
  } catch {
    // A malformed secret or signature verifies as nothing
  }

  return false
}

export class ResendApi {
  constructor(
    private apiKey: string,
    private fetchFn: typeof fetch = fetch,
  ) {}

  async getReceivedEmail(emailId: string): Promise<ResendReceivedEmail> {
    const response = await this.fetchFn(`https://api.resend.com/emails/receiving/${emailId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`Resend getReceivedEmail failed (${response.status}): ${JSON.stringify(err)}`)
    }
    return (await response.json()) as ResendReceivedEmail
  }

  async listReceivedEmailAttachments(emailId: string): Promise<ResendReceivedAttachment[]> {
    const response = await this.fetchFn(`https://api.resend.com/emails/receiving/${emailId}/attachments`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`Resend listReceivedEmailAttachments failed (${response.status}): ${JSON.stringify(err)}`)
    }
    const result = (await response.json()) as { data?: ResendReceivedAttachment[] }
    return result.data || []
  }

  async sendEmail(options: ResendSendEmailOptions): Promise<{ id: string }> {
    const response = await this.fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`Resend sendEmail failed (${response.status}): ${JSON.stringify(err)}`)
    }
    return (await response.json()) as { id: string }
  }
}
