import { stationImage, type Station } from "@/data/stations"
import { cn } from "@/lib/cn"

/** Responsive station photo with a fallback tint when a station has no picture yet. */
export function StationImage({
  station,
  className,
  sizes = "(min-width: 1024px) 640px, 100vw",
  priority = false,
}: {
  station: Station | undefined
  className?: string
  sizes?: string
  priority?: boolean
}) {
  const small = stationImage(station, 640)
  const large = stationImage(station, 1280)

  if (!small || !large) {
    return (
      <div
        className={cn(
          "bg-[linear-gradient(135deg,var(--color-secondary-soft),#ffd9c2)] dark:bg-[linear-gradient(135deg,#464552,#6f68df)]",
          className,
        )}
        aria-hidden="true"
      />
    )
  }

  return (
    <img
      src={large}
      srcSet={`${small} 640w, ${large} 1280w`}
      sizes={sizes}
      alt=""
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("h-full w-full object-cover", className)}
    />
  )
}
