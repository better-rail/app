import { useEffect, useState, type ReactNode } from "react"
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
  // Escape hides the bubble until the pointer and focus leave (WCAG 1.4.13), even when only the pointer is over it.
  const [hovered, setHovered] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!hovered) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setDismissed(true)
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [hovered])

  return (
    <span
      className={cn("group/tooltip relative inline-flex", className)}
      onKeyDown={(event) => event.key === "Escape" && setDismissed(true)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false)
        setDismissed(false)
      }}
      onBlur={() => setDismissed(false)}
    >
      {children}
      {!disabled && !dismissed && (
        <span
          aria-hidden="true"
          // The pseudo-element bridges the gap to the trigger; `invisible` keeps the hidden bubble from catching clicks.
          className="invisible absolute end-0 top-full z-20 mt-1.5 w-max max-w-[min(16rem,calc(100vw-2rem))] rounded-lg bg-text px-2 py-1 text-[12.5px] font-medium text-bg opacity-0 shadow-pop transition-[opacity,visibility] duration-150 before:absolute before:inset-x-0 before:-top-1.5 before:h-1.5 group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-has-[:focus-visible]/tooltip:visible group-has-[:focus-visible]/tooltip:opacity-100"
        >
          {label}
        </span>
      )}
    </span>
  )
}
