import type { ReactNode } from "react"
import { cn } from "@/lib/cn"
import type { Station } from "@/data/stations"
import { StationImage } from "./station-image"

/** The photo card from the app's planner screen. Renders as whatever element is passed in `as` (button / link). */
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
    <div
      className={cn("relative overflow-hidden rounded-card bg-surface-3", compact ? "h-24" : "h-44 sm:h-48 lg:h-56", className)}
    >
      <StationImage station={station} className="absolute inset-0" />
      <div className="station-photo-gradient absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:p-4">
        <span
          className={cn(
            "text-balance font-bold text-white drop-shadow-[0_1px_3px_rgb(0_0_0/0.8)]",
            compact ? "text-lg" : "text-xl sm:text-2xl",
          )}
        >
          {name}
        </span>
        {children}
      </div>
    </div>
  )
}
