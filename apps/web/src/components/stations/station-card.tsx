import type { ReactNode } from "react"
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
  compact = false,
}: {
  station: Station | undefined
  name: string
  className?: string
  children?: ReactNode
  compact?: boolean
}) {
  return (
    <span
      className={cn(
        "relative block overflow-hidden rounded-card bg-surface-3",
        compact ? "h-24" : "h-44 sm:h-48 lg:h-56",
        className,
      )}
    >
      <StationImage station={station} className="absolute inset-0" />
      <span className="station-photo-gradient absolute inset-0" aria-hidden="true" />
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:p-4">
        <span
          className={cn(
            "text-balance font-bold text-white drop-shadow-[0_1px_3px_rgb(0_0_0/0.8)]",
            compact ? "text-lg" : "text-xl sm:text-2xl",
          )}
        >
          {name}
        </span>
        {children}
      </span>
    </span>
  )
}
