import { stationImage, type Station } from "@/data/stations"
import { cn } from "@/lib/cn"

const DEFAULT_SIZES = "(min-width: 1024px) 640px, 100vw"

const warmed = new Set<string>()

/** Fetches a station's photo into the browser cache, so a card mounted for it a moment later paints on its first frame. */
export function preloadStationImage(station: Station | undefined, sizes = DEFAULT_SIZES) {
  const large = stationImage(station, 1280)
  if (!large || typeof Image === "undefined" || warmed.has(large)) return
  warmed.add(large)
  const img = new Image()
  img.sizes = sizes
  img.srcset = `${stationImage(station, 160)} 160w, ${stationImage(station, 640)} 640w, ${large} 1280w`
  img.src = large
}

/** Responsive station photo with a fallback tint when a station has no picture yet. */
export function StationImage({
  station,
  className,
  sizes = DEFAULT_SIZES,
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
    // A `span`: the card variant of the station picker renders this inside a `<button>`.
    return (
      <span
        className={cn(
          "block bg-[linear-gradient(135deg,var(--color-secondary-soft),#ffd9c2)] dark:bg-[linear-gradient(135deg,#464552,#6f68df)]",
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
      // Sync for a priority photo: a cached one then paints with the card instead of a frame after it.
      decoding={priority ? "sync" : "async"}
      className={cn("h-full w-full object-cover", className)}
    />
  )
}
