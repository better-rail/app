// Pieces that need react-leaflet hooks; only ever loaded lazily in the browser (Leaflet touches `window` on import).
import { useEffect, useState } from "react"
import { useMap, useMapEvents } from "react-leaflet"
import type { LatLngBoundsExpression, FitBoundsOptions } from "leaflet"
import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/cn"

export function MapZoomControlInner({ className }: { className?: string }) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) })

  return (
    <div
      className={cn("flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card", className)}
      role="group"
      aria-label="Zoom"
    >
      <button
        type="button"
        aria-label="Zoom in"
        disabled={zoom >= map.getMaxZoom()}
        onClick={() => map.zoomIn()}
        className="flex size-9 items-center justify-center hover:bg-surface-3 disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        disabled={zoom <= map.getMinZoom()}
        onClick={() => map.zoomOut()}
        className="flex size-9 items-center justify-center border-t border-line hover:bg-surface-3 disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
    </div>
  )
}

export function MapFitBoundsInner({ bounds, options }: { bounds: LatLngBoundsExpression; options?: FitBoundsOptions }) {
  const map = useMap()
  const key = JSON.stringify({ bounds, options })
  useEffect(() => {
    map.fitBounds(bounds, { animate: true, duration: 0.8, ...options })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])
  return null
}
