import replyTemplate from "./reply.html" with { type: "text" }

const template = String(replyTemplate)

// Leaves room for the <p> opening tag and <br /> under the 998-byte RFC 5322 line limit
const HTML_TEXT_LINE_BYTES = 800

export type TextDirectionInfo = {
  dir: "ltr" | "rtl"
  align: "left" | "right"
  lang: "en" | "he" | "ar"
}

export function detectTextDirection(text: string): TextDirectionInfo {
  const match = text.match(
    /([֐-׿יִ-ﭏ])|([؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])|([a-zA-ZÀ-ɏ])/u,
  )
  if (match?.[1]) return { dir: "rtl", align: "right", lang: "he" }
  if (match?.[2]) return { dir: "rtl", align: "right", lang: "ar" }
  return { dir: "ltr", align: "left", lang: "en" }
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Greedily packs words into lines of at most maxBytes; a longer word gets a line of its own
function packWords(words: string[], maxBytes: number): string[] {
  const lines: string[] = []
  let current: string | undefined
  let currentBytes = 0
  for (const word of words) {
    const wordBytes = Buffer.byteLength(word)
    if (current !== undefined && currentBytes + 1 + wordBytes <= maxBytes) {
      current += ` ${word}`
      currentBytes += 1 + wordBytes
    } else {
      if (current !== undefined) lines.push(current)
      current = word
      currentBytes = wordBytes
    }
  }
  if (current !== undefined) lines.push(current)
  return lines
}

// Wraps plain text at spaces; unbreakable runs (long URLs) are left for the transport encoding
export function enforceRfcLineLength(content: string, maxBytes = 900): string {
  return content
    .split(/\r?\n/)
    .flatMap((line) => (Buffer.byteLength(line) <= maxBytes ? [line] : packWords(line.split(" "), maxBytes)))
    .join("\r\n")
}

// Escapes a word, splitting overlong ones with <wbr\n>, which breaks the source line without visible whitespace
function escapeHtmlWord(word: string): string {
  const pieces: string[] = []
  let piece = ""
  let pieceBytes = 0
  for (const char of word) {
    const escaped = escapeHtml(char)
    const bytes = Buffer.byteLength(escaped)
    if (piece && pieceBytes + bytes > HTML_TEXT_LINE_BYTES) {
      pieces.push(piece)
      piece = ""
      pieceBytes = 0
    }
    piece += escaped
    pieceBytes += bytes
  }
  pieces.push(piece)
  return pieces.join("<wbr\n>")
}

export function formatEmailHtml(text: string, threadId: string): string {
  const normalized = text.replace(/\r\n/g, "\n")
  const { dir, align, lang } = detectTextDirection(normalized)

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  const toHtml = (p: string) =>
    p
      .split("\n")
      .map((line) => packWords(line.split(" ").map(escapeHtmlWord), HTML_TEXT_LINE_BYTES).join("\n"))
      .join("<br />\n")

  const content = (paragraphs.length ? paragraphs.map(toHtml) : ["(Empty message)"])
    .map(
      (p) =>
        `<p dir="${dir}" style="margin: 0 0 16px 0; line-height: 1.6; font-size: 16px; color: #1f2937; direction: ${dir}; text-align: ${align};">${p}</p>`,
    )
    .join("\n")

  // Function replacers keep "$&"-style patterns in the content literal
  return template
    .replaceAll("{{lang}}", lang)
    .replaceAll("{{dir}}", dir)
    .replaceAll("{{align}}", align)
    .replaceAll("{{threadId}}", () => escapeHtml(threadId))
    .replaceAll("{{content}}", () => content)
    .replace(/\r?\n/g, "\r\n")
}
