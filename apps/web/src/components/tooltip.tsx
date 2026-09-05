import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

/**
 * Hover/keyboard-focus label for an icon-only button. The trigger keeps its own `aria-label`, so the bubble is
 * decorative — it grows towards the inline start so a row of actions at the edge of a card never clips it.
 */
export function Tooltip({
  label,
  disabled = false,
  children,
  className,
}: {
  label: string
  /** Skips the bubble while something else is on top of the trigger, such as an open menu. */
  disabled?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      {!disabled && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute end-0 top-full z-20 mt-1.5 whitespace-nowrap rounded-lg bg-text px-2 py-1 text-[12.5px] font-medium text-bg opacity-0 shadow-pop transition-opacity duration-150 group-hover/tooltip:opacity-100 group-has-[:focus-visible]/tooltip:opacity-100"
        >
          {label}
        </span>
      )}
    </span>
  )
}
