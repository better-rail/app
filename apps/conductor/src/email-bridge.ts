import { type ConductorConfig, isSnowflake, SUPPORT_EMAIL_FROM } from "./config"
import type { DiscordApi, DiscordChannel, DiscordMessage } from "./discord"
import type { ResendApi, ResendReceivedEmail } from "./resend"

export type SlashCommandInteraction = {
  id: string
  token: string
  guild_id?: string
  channel_id?: string
  member?: {
    user?: { id?: string; username?: string }
    permissions?: string
  }
  data?: {
    name?: string
    options?: Array<{ name: string; value: string | number | boolean }>
  }
}

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB Discord upload limit (unboosted)
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

async function downloadAttachment(url: string, contentType?: string): Promise<Blob> {
  const resp = await fetch(url, { signal: AbortSignal.timeout(ATTACHMENT_DOWNLOAD_TIMEOUT_MS) })
  if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status} downloading attachment`)

  const contentLength = Number(resp.headers.get("content-length") || 0)
  if (contentLength > MAX_ATTACHMENT_BYTES) throw new Error(`Attachment exceeds ${MAX_ATTACHMENT_BYTES} bytes`)

  const reader = resp.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.length
      if (totalBytes > MAX_ATTACHMENT_BYTES) {
        await reader.cancel()
        throw new Error(`Attachment exceeds ${MAX_ATTACHMENT_BYTES} bytes`)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  return new Blob([Buffer.concat(chunks)], {
    type: contentType || resp.headers.get("content-type") || "application/octet-stream",
  })
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
          const originalSender = (await this.findBotEmailSender(candidateThreadId))?.toLowerCase()
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
        allowed_mentions: { parse: [] },
      })
    } else {
      await this.discordApi.call("POST", `/channels/${targetThreadId}/messages`, {
        content: header,
        allowed_mentions: { parse: [] },
      })
      for (let i = 0; i < chunks.length; i++) {
        const prefix = chunks.length > 1 ? `*(${i + 1}/${chunks.length})*\n` : ""
        await this.discordApi.call("POST", `/channels/${targetThreadId}/messages`, {
          content: `${prefix}${chunks[i]}`,
          allowed_mentions: { parse: [] },
        })
      }
    }

    if (overflowFile) {
      const form = new FormData()
      form.append(
        "payload_json",
        JSON.stringify({
          content: "**Attached full unedited email body:**",
          allowed_mentions: { parse: [] },
        }),
      )
      form.append("files[0]", new Blob([overflowFile.content], { type: "text/plain" }), overflowFile.filename)
      await this.discordApi.call("POST", `/channels/${targetThreadId}/messages`, form)
    }

    if (email.attachments && email.attachments.length > 0) {
      try {
        const receivedAttachments = await this.resendApi.listReceivedEmailAttachments(email.id).catch(() => [])
        for (let idx = 0; idx < receivedAttachments.length; idx++) {
          const att = receivedAttachments[idx]
          if (!att.download_url) continue
          if (att.size && att.size > MAX_ATTACHMENT_BYTES) {
            console.warn(`Conductor: skipping attachment ${att.filename} (${att.size} bytes exceeds limit)`)
            continue
          }
          try {
            const blob = await downloadAttachment(att.download_url, att.content_type)
            const form = new FormData()
            form.append(
              "payload_json",
              JSON.stringify({
                content: `**Attachment:** \`${att.filename || "attachment"}\``,
                allowed_mentions: { parse: [] },
              }),
            )
            form.append("files[0]", blob, att.filename || `attachment_${idx + 1}`)
            await this.discordApi.call("POST", `/channels/${targetThreadId}/messages`, form)
          } catch (attErr) {
            console.error(`Conductor: failed to attach file ${att.filename}:`, (attErr as Error).message)
          }
        }
      } catch (listErr) {
        console.error("Conductor: failed to list email attachments:", (listErr as Error).message)
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

    const perms = BigInt(interaction.member?.permissions || "0")
    const MANAGE_MESSAGES = 1n << 13n
    const ADMINISTRATOR = 1n << 3n
    if ((perms & MANAGE_MESSAGES) === 0n && (perms & ADMINISTRATOR) === 0n) {
      return { success: false, message: "You do not have permission to use `/reply`." }
    }

    const messageOption = interaction.data?.options?.find((opt) => opt.name === "message")?.value
    const replyText = typeof messageOption === "string" ? messageOption.trim() : ""
    if (!replyText) {
      return { success: false, message: "Reply message cannot be empty." }
    }

    const recipientEmail = await this.findBotEmailSender(channelId)
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

  private async findBotEmailSender(threadId: string): Promise<string | undefined> {
    const messages = await this.discordApi
      .call<DiscordMessage[]>("GET", `/channels/${threadId}/messages?after=${threadId}&limit=1`)
      .catch(() => [] as DiscordMessage[])
    const firstMsg = messages[0]
    if (!firstMsg || !this.isBotAuthor(firstMsg)) return undefined

    const match = firstMsg.content?.match(/^\*\*New Email from:\*\*\s*`([^`]+)`/)
    if (match) {
      return extractSenderEmail(match[1])
    }
    return undefined
  }

  private isBotAuthor(msg: DiscordMessage): boolean {
    if (!msg.author?.bot) return false
    if (this.config.applicationId && msg.author.id !== this.config.applicationId) return false
    return true
  }
}
