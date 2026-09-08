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
  const thumb = stationImage(station, 160)
  const small = stationImage(station, 640)
  const large = stationImage(station, 1280)

  if (!thumb || !small || !large) {
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
      srcSet={`${thumb} 160w, ${small} 640w, ${large} 1280w`}
      sizes={sizes}
      alt=""
      // Landscape photos, all of them: the ratio holds the box open until the picture arrives.
      width={1280}
      height={853}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("h-full w-full object-cover", className)}
    />
  )
}
