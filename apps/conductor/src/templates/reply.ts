import replyTemplate from "./reply.html" with { type: "text" }

const template = String(replyTemplate)

export type TextDirectionInfo = {
  dir: "ltr" | "rtl"
  align: "left" | "right"
  lang: "en" | "he" | "ar"
}

export function detectTextDirection(text: string): TextDirectionInfo {
  const match = text.match(
    /([\u0590-\u05FF\uFB1D-\uFB4F])|([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF])|([a-zA-Z\u00C0-\u024F])/u,
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

export function enforceRfcLineLength(content: string, maxLineLength = 900): string {
  const lines = content.split(/\r?\n/)
  const safeLines: string[] = []

  for (const line of lines) {
    let remaining = line
    while (remaining.length > maxLineLength) {
      const splitIdx = remaining.lastIndexOf(" ", maxLineLength)
      const at = splitIdx > maxLineLength * 0.3 ? splitIdx : maxLineLength
      safeLines.push(remaining.slice(0, at))
      remaining = remaining.slice(at).trimStart()
    }
    safeLines.push(remaining)
  }

  return safeLines.join("\r\n")
}

export function formatEmailHtml(text: string, threadId: string): string {
  const { dir, align, lang } = detectTextDirection(text)

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p dir="${dir}" style="margin: 0 0 16px 0; line-height: 1.6; font-size: 16px; color: #1f2937; direction: ${dir}; text-align: ${align};">${escapeHtml(p).replace(/\n/g, "<br />\n")}</p>`,
    )
    .join("\n")

  const content =
    paragraphs ||
    `<p dir="${dir}" style="margin: 0 0 16px 0; line-height: 1.6; font-size: 16px; color: #1f2937; direction: ${dir}; text-align: ${align};">(Empty message)</p>`

  const html = template
    .replaceAll("{{lang}}", lang)
    .replaceAll("{{dir}}", dir)
    .replaceAll("{{align}}", align)
    .replaceAll("{{content}}", content)
    .replaceAll("{{threadId}}", escapeHtml(threadId))

  return enforceRfcLineLength(html)
}
