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
const HEADER_SEPARATOR = "-".repeat(30)
// Also matches the "─" separator used by messages posted before the switch to "-"
const HEADER_SEPARATOR_RE = /^(?:-{30}|─{30})$/m

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

function extractEmailMessageId(email: ResendReceivedEmail): string | undefined {
  if (email.message_id && typeof email.message_id === "string" && email.message_id.trim()) {
    const trimmed = email.message_id.trim()
    return trimmed.startsWith("<") && trimmed.endsWith(">") ? trimmed : `<${trimmed}>`
  }
  if (email.headers) {
    for (const key of ["message-id", "Message-ID", "Message-Id", "MESSAGE-ID"]) {
      const val = email.headers[key]
      const str = (Array.isArray(val) ? val[0] : val)?.trim()
      if (str) {
        return str.startsWith("<") && str.endsWith(">") ? str : `<${str}>`
      }
    }
  }
  return undefined
}

function extractHeaderMessageId(content?: string): string | undefined {
  if (!content) return undefined
  if (!/^\*\*(?:New|Follow-up) Email from:\*\*/.test(content)) return undefined
  const separatorIdx = content.search(HEADER_SEPARATOR_RE)
  if (separatorIdx === -1) return undefined
  const headerPart = content.slice(0, separatorIdx)
  const match = headerPart.match(/\*\*Message-ID:\*\*\s*(?:`([^`\r\n]+)`|([^\s\r\n]+))/)
  const raw = match ? (match[1] || match[2])?.trim() : undefined
  if (!raw) return undefined
  const id = raw.startsWith("<") && raw.endsWith(">") ? raw : `<${raw}>`
  if (!/^<[^<>\s\r\n]{1,256}>$/.test(id)) return undefined
  return id
}

function extractHeaderSubject(content?: string): string | undefined {
  if (!content) return undefined
  const match = content.match(/\*\*Subject:\*\*\s*(.+)$/m)
  if (!match) return undefined
  const subject = match[1].trim()
  return subject === "(No Subject)" ? "" : subject
}

export function formatReplySubject(originalSubject?: string): string {
  const clean = (originalSubject || "")
    .replace(/\[#\d{17,20}\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
  if (!clean || clean === "(No Subject)") {
    return "Re: Email Feedback"
  }
  if (/^re:\s*/i.test(clean)) {
    return clean
  }
  return `Re: ${clean}`
}

import {
  detectTextDirection,
  enforceRfcLineLength,
  formatEmailHtml,
  type TextDirectionInfo,
} from "./templates/reply"

export {
  detectTextDirection,
  enforceRfcLineLength,
  formatEmailHtml,
  type TextDirectionInfo,
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

export function formatEmailHeader(
  from: string,
  subject?: string,
  isFollowUp = false,
  messageId?: string,
): string {
  return [
    `**${isFollowUp ? "Follow-up" : "New"} Email from:** \`${from.slice(0, 300)}\``,
    ...(!isFollowUp ? [`**Subject:** ${(subject || "(No Subject)").slice(0, 300)}`] : []),
    ...(messageId ? [`**Message-ID:** \`${messageId}\``] : []),
    HEADER_SEPARATOR,
  ].join("\n")
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
          const originalSender = (await this.findStarterEmail(candidateThreadId)).recipientEmail?.toLowerCase()
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
    const parsed = chunkEmailBody(bodyContent)
    const overflowFile = parsed.overflowFile
    // Shorten separator runs so a body chunk can't pass as a header message
    const chunks = parsed.chunks.map((c) => c.replace(/-{30,}|─{30,}/g, (run) => run[0].repeat(10)))
    const messageId = extractEmailMessageId(email)
    const header = formatEmailHeader(email.from, email.subject, isFollowUp, messageId)

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

    const threadContext = await this.findThreadEmailContext(channelId)
    const recipientEmail = threadContext.recipientEmail
    if (!recipientEmail || !recipientEmail.includes("@")) {
      return { success: false, message: "Could not find original customer email in this thread." }
    }

    const subject = formatReplySubject(threadContext.subject)
    const emailBody = enforceRfcLineLength(
      `${replyText}\n\n--------------\nBetter Rail Support • Ref: [#${channelId}]`,
    )

    const headers: Record<string, string> = {}
    const threadRef = `<thread-${channelId}@better-rail.co.il>`
    if (threadContext.messageId) {
      headers["In-Reply-To"] = threadContext.messageId
      const refs = [...threadContext.allMessageIds, threadRef].filter(Boolean)
      headers["References"] = Array.from(new Set(refs)).join(" ")
    } else {
      headers["In-Reply-To"] = threadRef
      headers["References"] = threadRef
    }

    const htmlBody = formatEmailHtml(replyText, channelId)

    await this.resendApi.sendEmail({
      from: SUPPORT_EMAIL_FROM,
      to: [recipientEmail],
      subject,
      text: emailBody,
      html: htmlBody,
      reply_to: `feedback+${channelId}@better-rail.co.il`,
      headers,
    })

    const senderName = interaction.member?.user?.username || "A team member"
    const quoted = replyText.replace(/\n/g, "\n> ")
    const fullMessage = `**Email reply sent to** \`${recipientEmail}\` by **${senderName}**:\n> ${quoted}`
    const finalMessage = fullMessage.length > 2000 ? `${fullMessage.slice(0, 1997)}...` : fullMessage
    return {
      success: true,
      message: finalMessage,
    }
  }

  private async findStarterEmail(
    threadId: string,
  ): Promise<{ recipientEmail?: string; subject?: string; messageId?: string }> {
    const starterMessages = await this.discordApi
      .call<DiscordMessage[]>("GET", `/channels/${threadId}/messages?after=${threadId}&limit=1`)
      .catch(() => [] as DiscordMessage[])

    const starterMsg = starterMessages[0]
    if (!starterMsg || !this.isBotAuthor(starterMsg)) return {}
    const match = starterMsg.content?.match(/^\*\*New Email from:\*\*\s*`([^`]+)`/)
    if (!match) return {}
    return {
      recipientEmail: extractSenderEmail(match[1]),
      subject: extractHeaderSubject(starterMsg.content),
      messageId: extractHeaderMessageId(starterMsg.content),
    }
  }

  private async findThreadEmailContext(threadId: string): Promise<{
    recipientEmail?: string
    subject?: string
    messageId?: string
    allMessageIds: string[]
  }> {
    const { recipientEmail, subject, messageId: starterMessageId } = await this.findStarterEmail(threadId)

    const messages = await this.discordApi
      .call<DiscordMessage[]>("GET", `/channels/${threadId}/messages?limit=20`)
      .catch(() => [] as DiscordMessage[])

    const botMessages = messages.filter((m) => this.isBotAuthor(m))
    const recentMessageIds: string[] = []
    let latestMessageId: string | undefined

    for (const msg of botMessages) {
      const msgId = extractHeaderMessageId(msg.content)
      if (msgId) {
        if (!latestMessageId) latestMessageId = msgId
        if (!recentMessageIds.includes(msgId)) recentMessageIds.push(msgId)
      }
    }

    const allMessageIds = starterMessageId ? [starterMessageId] : []
    for (const id of recentMessageIds.reverse()) {
      if (!allMessageIds.includes(id)) {
        allMessageIds.push(id)
      }
    }

    return {
      recipientEmail,
      subject,
      messageId: latestMessageId || starterMessageId,
      allMessageIds,
    }
  }

  private isBotAuthor(msg: DiscordMessage): boolean {
    if (!msg.author?.bot) return false
    if (this.config.applicationId && msg.author.id !== this.config.applicationId) return false
    return true
  }
}
