import type { ReactNode, Ref } from "react"
import { cn } from "@/lib/cn"
import type { Station } from "@/data/stations"
import { StationImage } from "./station-image"

/**
 * The photo card from the app's planner screen. Built out of spans (the absolutely positioned ones are blockified by
 * their own `position`): the station picker's trigger is a `<button>`, which may only contain phrasing content.
 */
export function StationPhotoCard({
  station,
  name,
  className,
  children,
  size = "default",
  transitionName,
  ref,
}: {
  station: Station | undefined
  name: string
  className?: string
  children?: ReactNode
  size?: "default" | "header"
  transitionName?: string
  ref?: Ref<HTMLSpanElement>
}) {
  return (
    <span
      ref={ref}
      style={transitionName ? { viewTransitionName: transitionName } : undefined}
      className={cn(
        "relative block overflow-hidden rounded-card bg-surface-3",
        size === "header" ? "h-13 sm:h-14" : "h-44 sm:h-48 lg:h-56",
        className,
      )}
    >
      <StationImage station={station} className="absolute inset-0" />
      <span className="station-photo-gradient absolute inset-0" aria-hidden="true" />
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 flex items-end justify-between gap-2",
          size === "header" ? "p-2" : "p-3 sm:p-4",
        )}
      >
        <span
          className={cn(
            "text-balance font-bold text-white drop-shadow-[0_1px_3px_rgb(0_0_0/0.8)]",
            size === "header" ? "min-w-0 flex-1 truncate text-[15px] leading-tight sm:text-base" : "text-xl sm:text-2xl",
          )}
        >
          {name}
        </span>
        {children}
      </span>
    </span>
  )
}
