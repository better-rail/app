import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

/** Narrow reading column used by the marketing / legal pages. */
export function ContentPage({
  title,
  subtitle,
  children,
  width = "narrow",
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  width?: "narrow" | "wide"
  className?: string
}) {
  return (
    <article className={cn("container-page py-10 sm:py-14", className)}>
      <div className={cn("mx-auto", width === "narrow" ? "max-w-2xl" : "max-w-4xl")}>
        <header className="mb-8">
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-3 text-lg text-muted">{subtitle}</p>}
        </header>
        <div className="prose-page">{children}</div>
      </div>
    </article>
  )
}
