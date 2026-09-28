import { type ConductorConfig, isSnowflake, SUPPORT_EMAIL_FROM } from "./config"
import type { DiscordApi, DiscordChannel, DiscordMessage } from "./discord"
import type { ResendApi, ResendReceivedEmail } from "./resend"

export type SlashCommandInteraction = {
  id: string
  token: string
  guild_id?: string
  channel_id?: string
  member?: { user?: { id?: string; username?: string } }
  data?: {
    name?: string
    options?: Array<{ name: string; value: string | number | boolean }>
  }
}

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024 // 25 MB Discord upload limit
export const ATTACHMENT_DOWNLOAD_TIMEOUT_MS = 15_000

export function extractThreadId(
  subject?: string,
  headers?: Record<string, string | string[]>,
  to?: string[],
  body?: string,
): string | undefined {
  if (subject) {
    const match = subject.match(/\[#?(\d{17,20})\]/)
    if (match) return match[1]
  }

  if (headers) {
    for (const key of ["in-reply-to", "In-Reply-To", "references", "References"]) {
      const val = headers[key]
      const str = Array.isArray(val) ? val.join(" ") : val
      if (str) {
        const match = str.match(/<thread-(\d{17,20})@/i)
        if (match) return match[1]
      }
    }
  }

  if (to) {
    for (const addr of to) {
      const match = addr.match(/\+(\d{17,20})@/)
      if (match) return match[1]
    }
  }

  if (body) {
    const match = body.match(/(?:ref:\s*\[#?|\[#)(\d{17,20})\]/i)
    if (match) return match[1]
  }

  return undefined
}

export function extractSenderEmail(from: string): string {
  const bracketMatch = from.match(/<([^>]+)>/)
  if (bracketMatch && bracketMatch[1].includes("@")) return bracketMatch[1].trim()
  const emailMatch = from.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  if (emailMatch) return emailMatch[0].trim()
  return from.trim()
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function chunkEmailBody(
  text: string,
  maxChunk = 1800,
): { chunks: string[]; overflowFile?: { filename: string; content: string } } {
  if (text.length > 4000) {
    const preview =
      text.slice(0, maxChunk).trimEnd() +
      "\n\n*(Full email body exceeds 4,000 characters; full copy attached below)*"
    return {
      chunks: [preview],
      overflowFile: {
        filename: "email_body.txt",
        content: text,
      },
    }
  }

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxChunk) {
      chunks.push(remaining)
      break
    }
    let splitAt = remaining.lastIndexOf("\n", maxChunk)
    if (splitAt === -1 || splitAt < maxChunk * 0.4) {
      splitAt = remaining.lastIndexOf(" ", maxChunk)
    }
    if (splitAt === -1) splitAt = maxChunk

    chunks.push(remaining.slice(0, splitAt).trim())
    remaining = remaining.slice(splitAt).trimStart()
  }

  return { chunks: chunks.length ? chunks : ["(Empty message)"] }
}

export function formatEmailHeader(from: string, subject?: string, isFollowUp = false): string {
  if (isFollowUp) {
    return `**Follow-up Email from:** \`${from}\`\n──────────────────────────────`
  }
  return `**New Email from:** \`${from}\`\n**Subject:** ${subject || "(No Subject)"}\n──────────────────────────────`
}

export class EmailBridge {
  constructor(
    private config: ConductorConfig,
    private discordApi: DiscordApi,
    private resendApi: ResendApi,
  ) {}

  async handleInboundEmail(email: ResendReceivedEmail): Promise<{ threadId: string; created: boolean }> {
    const feedbackChannelId = this.config.emailFeedbackChannelId
    if (!feedbackChannelId || !isSnowflake(feedbackChannelId)) {
      throw new Error("Conductor: DISCORD_EMAIL_FEEDBACK_CHANNEL_ID is not configured or invalid")
    }

    const rawBody = email.text || (email.html ? htmlToText(email.html) : "")
    const candidateThreadId = extractThreadId(email.subject, email.headers, email.to, rawBody)
    let targetThreadId: string | undefined
    let isFollowUp = false

    if (candidateThreadId && isSnowflake(candidateThreadId)) {
      try {
        const channel = await this.discordApi.call<DiscordChannel>("GET", `/channels/${candidateThreadId}`)
        if (
          channel &&
          channel.parent_id === feedbackChannelId &&
          (channel.guild_id ? channel.guild_id === this.config.guildId : true)
        ) {
          const originalSender = await this.getThreadOriginalSender(candidateThreadId)
          const currentSender = extractSenderEmail(email.from).toLowerCase()
          if (originalSender && originalSender === currentSender) {
            targetThreadId = candidateThreadId
            isFollowUp = true
            if (channel.thread_metadata?.archived) {
              await this.discordApi.call("PATCH", `/channels/${candidateThreadId}`, { archived: false }).catch(() => {})
            }
          } else {
            console.warn(
              `Conductor: sender mismatch for thread ${candidateThreadId} (original: ${originalSender}, received: ${currentSender}), opening a new thread instead`,
            )
          }
        }
      } catch (err) {
        console.warn(`Conductor: candidate thread ${candidateThreadId} not found, opening a new thread instead`)
      }
    }

    if (!targetThreadId) {
      const subjectClean = (email.subject || "Email Feedback").trim().replace(/[\r\n]+/g, " ")
      const threadTitle = subjectClean.slice(0, 100) || "Email Feedback"

      const newThread = await this.discordApi.call<DiscordChannel>(
        "POST",
        `/channels/${feedbackChannelId}/threads`,
        {
          name: threadTitle,
          type: 11, // PUBLIC_THREAD
          auto_archive_duration: 10080, // 7 days
        },
      )
      targetThreadId = newThread.id
    }

    const bodyContent = rawBody || "(No message body)"
    const { chunks, overflowFile } = chunkEmailBody(bodyContent)
    const header = formatEmailHeader(email.from, email.subject, isFollowUp)

    if (chunks.length === 1 && !overflowFile && (header + "\n" + chunks[0]).length <= 1900) {
      await this.discordApi.call("POST", `/channels/${targetThreadId}/messages`, {
        content: `${header}\n${chunks[0]}`,
      })
    } else {
      await this.discordApi.call("POST", `/channels/${targetThreadId}/messages`, {
        content: header,
      })
      for (let i = 0; i < chunks.length; i++) {
        const prefix = chunks.length > 1 ? `*(${i + 1}/${chunks.length})*\n` : ""
        await this.discordApi.call("POST", `/channels/${targetThreadId}/messages`, {
          content: `${prefix}${chunks[i]}`,
        })
      }
    }

    if (overflowFile) {
      const form = new FormData()
      form.append("payload_json", JSON.stringify({ content: "**Attached full unedited email body:**" }))
      form.append("files[0]", new Blob([overflowFile.content], { type: "text/plain" }), overflowFile.filename)
      await this.discordApi.call("POST", `/channels/${targetThreadId}/messages`, form)
    }

    if (email.attachments && email.attachments.length > 0) {
      for (let idx = 0; idx < email.attachments.length; idx++) {
        const att = email.attachments[idx]
        try {
          let blob: Blob | undefined
          if (att.download_url) {
            const resp = await fetch(att.download_url, {
              signal: AbortSignal.timeout(ATTACHMENT_DOWNLOAD_TIMEOUT_MS),
            })
            if (!resp.ok) {
              throw new Error(`HTTP ${resp.status} downloading attachment`)
            }
            if (!resp.body) {
              throw new Error("Missing response body downloading attachment")
            }

            const contentLength = Number(resp.headers.get("content-length") || 0)
            if (contentLength > MAX_ATTACHMENT_BYTES) {
              throw new Error(`Attachment exceeds maximum size of ${MAX_ATTACHMENT_BYTES} bytes`)
            }

            const reader = resp.body.getReader()
            const chunks: Uint8Array[] = []
            let totalBytes = 0

            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) {
                  totalBytes += value.length
                  if (totalBytes > MAX_ATTACHMENT_BYTES) {
                    await reader.cancel()
                    throw new Error(`Attachment exceeded maximum size of ${MAX_ATTACHMENT_BYTES} bytes`)
                  }
                  chunks.push(value)
                }
              }
            } catch (readErr) {
              await reader.cancel().catch(() => {})
              throw readErr
            }

            blob = new Blob([Buffer.concat(chunks)], {
              type: att.content_type || resp.headers.get("content-type") || "application/octet-stream",
            })
          } else if (att.content) {
            const buffer = Buffer.from(att.content, "base64")
            if (buffer.length > MAX_ATTACHMENT_BYTES) {
              throw new Error(`Attachment exceeds maximum size of ${MAX_ATTACHMENT_BYTES} bytes`)
            }
            blob = new Blob([buffer], {
              type: att.content_type || "application/octet-stream",
            })
          }
          if (blob) {
            const form = new FormData()
            form.append(
              "payload_json",
              JSON.stringify({ content: `**Attachment:** \`${att.filename || "attachment"}\`` }),
            )
            form.append("files[0]", blob, att.filename || `attachment_${idx + 1}`)
            await this.discordApi.call("POST", `/channels/${targetThreadId}/messages`, form)
          }
        } catch (attErr) {
          console.error(`Conductor: failed to attach file ${att.filename}:`, (attErr as Error).message)
        }
      }
    }

    return { threadId: targetThreadId, created: !isFollowUp }
  }

  async handleReplyCommand(interaction: SlashCommandInteraction): Promise<{ success: boolean; message: string }> {
    const channelId = interaction.channel_id
    const feedbackChannelId = this.config.emailFeedbackChannelId

    if (!channelId || !feedbackChannelId) {
      return { success: false, message: "Configuration error: channel missing." }
    }

    const channel = await this.discordApi.call<DiscordChannel>("GET", `/channels/${channelId}`).catch(() => undefined)
    if (!channel || channel.parent_id !== feedbackChannelId) {
      return { success: false, message: "`/reply` can only be used inside an #email-feedback thread." }
    }

    const messageOption = interaction.data?.options?.find((opt) => opt.name === "message")?.value
    const replyText = typeof messageOption === "string" ? messageOption.trim() : ""
    if (!replyText) {
      return { success: false, message: "Reply message cannot be empty." }
    }

    let recipientEmail: string | undefined
    let beforeId: string | undefined

    for (let page = 0; page < 5; page++) {
      const url = `/channels/${channelId}/messages?limit=100${beforeId ? `&before=${beforeId}` : ""}`
      const messages = await this.discordApi.call<DiscordMessage[]>("GET", url).catch(() => [])
      if (!messages || messages.length === 0) break

      for (const msg of messages) {
        if (!this.isBotAuthor(msg)) continue

        if (msg.content.includes("**New Email from:**") || msg.content.includes("**Follow-up Email from:**")) {
          const fromMatch = msg.content.match(/\*\*(?:New|Follow-up) Email from:\*\* `([^`]+)`/)
          if (fromMatch) {
            recipientEmail = extractSenderEmail(fromMatch[1])
            break
          }
        }
      }
      if (recipientEmail) break

      const nextBeforeId = messages[messages.length - 1]?.id
      if (!nextBeforeId || nextBeforeId === beforeId) break
      beforeId = nextBeforeId
    }

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return { success: false, message: "Could not find original customer email in this thread." }
    }

    const rawTitle = channel.name || "Email Feedback"
    const cleanTitle = rawTitle.replace(/\[#?\d+\]/g, "").replace(/^Re:\s*/i, "").trim()
    const subject = `Re: ${cleanTitle} [#${channelId}]`

    const emailBody = `${replyText}\n\n──────────────\nBetter Rail Support • Ref: [#${channelId}]`

    await this.resendApi.sendEmail({
      from: SUPPORT_EMAIL_FROM,
      to: [recipientEmail],
      subject,
      text: emailBody,
      reply_to: "feedback@better-rail.co.il",
      headers: {
        "In-Reply-To": `<thread-${channelId}@better-rail.co.il>`,
        "References": `<thread-${channelId}@better-rail.co.il>`,
      },
    })

    const senderName = interaction.member?.user?.username || "A team member"
    return {
      success: true,
      message: `**Email reply sent to** \`${recipientEmail}\` by **${senderName}**:\n> ${replyText.replace(/\n/g, "\n> ")}`,
    }
  }

  private async getThreadOriginalSender(threadId: string): Promise<string | undefined> {
    let beforeId: string | undefined
    for (let page = 0; page < 5; page++) {
      const url = `/channels/${threadId}/messages?limit=100${beforeId ? `&before=${beforeId}` : ""}`
      const messages = await this.discordApi.call<DiscordMessage[]>("GET", url).catch(() => [])
      if (!messages || messages.length === 0) break

      for (const msg of messages) {
        if (!this.isBotAuthor(msg)) continue

        if (msg.content.includes("**New Email from:**")) {
          const fromMatch = msg.content.match(/\*\*New Email from:\*\* `([^`]+)`/)
          if (fromMatch) {
            return extractSenderEmail(fromMatch[1]).toLowerCase()
          }
        }
      }

      const nextBeforeId = messages[messages.length - 1]?.id
      if (!nextBeforeId || nextBeforeId === beforeId) break
      beforeId = nextBeforeId
    }
    return undefined
  }

  private isBotAuthor(msg: DiscordMessage): boolean {
    if (!msg.author?.bot) return false
    if (this.config.applicationId && msg.author.id !== this.config.applicationId) return false
    return true
  }
}
