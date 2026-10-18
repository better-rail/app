import type { ReactNode } from "react"
import { useT } from "@/i18n"
import { cn } from "@/lib/cn"

/** Reading column for the marketing / legal pages, styled after the old static site (`site-page.css`). */
export function ContentPage({
  title,
  before,
  children,
  className,
}: {
  title: ReactNode
  /** Rendered above the title. */
  before?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <article className={cn("site-page", className)}>
      {before}
      <h1 className="site-page-content-title">{title}</h1>
      {children}
    </article>
  )
}

/** Hidden "(opens in a new tab)" for links with `target="_blank"`. */
export function NewTabHint() {
  const t = useT()
  return <span className="sr-only"> {t("a11y.newTab")}</span>
}
