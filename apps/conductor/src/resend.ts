import { createHmac, timingSafeEqual } from "node:crypto"

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

export type ResendReceivedEmail = {
  id: string
  from: string
  to: string[]
  subject?: string
  html?: string
  text?: string
  headers?: Record<string, string | string[]>
  attachments?: Array<{
    id: string
    filename: string
    content_type: string
    download_url?: string
    content?: string
  }>
}

export type ResendSendEmailOptions = {
  from: string
  to: string[]
  subject: string
  text: string
  reply_to?: string
  headers?: Record<string, string>
  attachments?: Array<{
    filename: string
    content: string | Buffer
  }>
}

export function parseSvixSecret(secret: string): Buffer {
  if (secret.startsWith("whsec_")) {
    return Buffer.from(secret.slice(6), "base64")
  }
  return Buffer.from(secret, "utf-8")
}

export function verifyResendSignature(request: Request, body: Buffer, secret: string): boolean {
  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")
  if (!svixId || !svixTimestamp || !svixSignature) return false

  const timestampNum = Number(svixTimestamp)
  if (Number.isNaN(timestampNum)) return false
  if (Math.abs(Date.now() / 1000 - timestampNum) > 300) return false

  const secretKey = parseSvixSecret(secret)
  const toSign = Buffer.concat([Buffer.from(`${svixId}.${svixTimestamp}.`), body])
  const expectedSignature = createHmac("sha256", secretKey).update(toSign).digest("base64")

  const passedSignatures = svixSignature.split(" ")
  for (const item of passedSignatures) {
    const [version, signature] = item.split(",")
    if (version !== "v1" || !signature) continue
    const expectedBuf = Buffer.from(expectedSignature, "base64")
    const actualBuf = Buffer.from(signature, "base64")
    if (expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf)) {
      return true
    }
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
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`Resend getReceivedEmail failed (${response.status}): ${JSON.stringify(err)}`)
    }
    return (await response.json()) as ResendReceivedEmail
  }

  async sendEmail(options: ResendSendEmailOptions): Promise<{ id: string }> {
    const response = await this.fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`Resend sendEmail failed (${response.status}): ${JSON.stringify(err)}`)
    }
    return (await response.json()) as { id: string }
  }
}
