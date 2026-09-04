import type { ReactNode } from "react"
import { cn } from "@/lib/cn"
import type { Station } from "@/data/stations"
import { StationImage } from "./station-image"

// Shrinks with the viewport so both planner cards fit beside the map.
export const PLANNER_CARD_HEIGHT = "h-44 sm:h-48 lg:h-[clamp(9rem,20dvh,14rem)]"

export function StationPhotoCard({
  station,
  name,
  className,
  children,
  compact = false,
  heightClass = PLANNER_CARD_HEIGHT,
}: {
  station: Station | undefined
  name: string
  className?: string
  children?: ReactNode
  compact?: boolean
  heightClass?: string
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-card bg-surface-3", compact ? "h-24" : heightClass, className)}>
      <StationImage station={station} className="absolute inset-0 transition-[filter] duration-300 group-hover:brightness-110" />
      <div
        className="station-photo-gradient absolute inset-0 transition-opacity duration-300 group-hover:opacity-85"
        aria-hidden="true"
      />
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
