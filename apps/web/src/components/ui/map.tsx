// SSR-safe Leaflet wrappers in the spirit of shadcn-map (github.com/tonghohin/shadcn-map), trimmed to what we use.
import { lazy, Suspense, useEffect, useState, type ComponentPropsWithoutRef, type ComponentType, type ReactNode } from "react"
import type { LatLngBoundsExpression, FitBoundsOptions, DivIconOptions } from "leaflet"
import type {
  MapContainerProps,
  TileLayerProps,
  MarkerProps,
  PolylineProps,
  CircleMarkerProps,
  TooltipProps,
} from "react-leaflet"
import { cn } from "@/lib/cn"

function createLazyComponent<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  const LazyComponent = lazy(factory)
  return (props: ComponentPropsWithoutRef<T>) => {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    if (!mounted) return null
    return (
      <Suspense>
        <LazyComponent {...(props as any)} />
      </Suspense>
    )
  }
}

const LeafletMapContainer = createLazyComponent(() => import("react-leaflet").then((m) => ({ default: m.MapContainer })))
const LeafletTileLayer = createLazyComponent(() => import("react-leaflet").then((m) => ({ default: m.TileLayer })))
const LeafletMarker = createLazyComponent(() => import("react-leaflet").then((m) => ({ default: m.Marker })))
const LeafletPolyline = createLazyComponent(() => import("react-leaflet").then((m) => ({ default: m.Polyline })))
const LeafletCircleMarker = createLazyComponent(() => import("react-leaflet").then((m) => ({ default: m.CircleMarker })))
const LeafletTooltip = createLazyComponent(() => import("react-leaflet").then((m) => ({ default: m.Tooltip })))
const ZoomControl = createLazyComponent(() => import("./map-client").then((m) => ({ default: m.MapZoomControlInner })))
const FitBounds = createLazyComponent(() => import("./map-client").then((m) => ({ default: m.MapFitBoundsInner })))

export function useLeaflet() {
  const [L, setL] = useState<typeof import("leaflet") | null>(null)
  useEffect(() => {
    import("leaflet").then((mod) => setL(mod.default ?? mod))
  }, [])
  return L
}

export function useIsDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const update = () => setDark(document.documentElement.classList.contains("dark"))
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])
  return dark
}

export function Map({ className, maxZoom = 18, ...props }: MapContainerProps) {
  return (
    <LeafletMapContainer
      maxZoom={maxZoom}
      zoomControl={false}
      attributionControl={false}
      className={cn("z-0 size-full min-h-64 bg-surface-3", className)}
      {...props}
    />
  )
}

// OSM tiles need no API key (CARTO watermarks keyless requests); dark mode is a CSS filter.
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
export const TILE_ATTRIBUTION = "© OpenStreetMap contributors"

export function MapTileLayer({ url = OSM_TILES, className, ...props }: Partial<TileLayerProps>) {
  const dark = useIsDark()
  return (
    <LeafletTileLayer
      key={dark ? "dark" : "light"}
      url={url}
      maxZoom={19}
      className={cn(dark && "map-tiles-dark", className)}
      {...props}
    />
  )
}

export function MapMarker({
  icon,
  iconSize = [24, 24],
  iconAnchor = [12, 12],
  tooltipAnchor,
  ...props
}: Omit<MarkerProps, "icon"> & Pick<DivIconOptions, "iconSize" | "iconAnchor" | "tooltipAnchor"> & { icon: string }) {
  const L = useLeaflet()
  if (!L) return null
  // An explicit `undefined` overrides Leaflet's defaults and crashes tooltips, so only pass what is set.
  const options: DivIconOptions = {
    html: icon,
    className: "leaflet-div-icon",
    iconSize,
    iconAnchor,
    ...(tooltipAnchor ? { tooltipAnchor } : {}),
  }
  return <LeafletMarker icon={L.divIcon(options)} {...props} />
}

export function MapCircleMarker(props: CircleMarkerProps) {
  return <LeafletCircleMarker {...props} />
}

export function MapPolyline(props: PolylineProps) {
  return <LeafletPolyline {...props} />
}

export function MapTooltip({ className, children, ...props }: TooltipProps & { children: ReactNode }) {
  return (
    <LeafletTooltip
      className={cn(
        "!rounded-md !border-0 !bg-text !px-2.5 !py-1 !text-[13px] !font-semibold !text-bg !shadow-card before:!hidden",
        className,
      )}
      {...props}
    >
      {children}
    </LeafletTooltip>
  )
}

export function MapZoomControl({ className }: { className?: string }) {
  return <ZoomControl className={className} />
}

export function MapFitBounds(props: { bounds: LatLngBoundsExpression; options?: FitBoundsOptions }) {
  return <FitBounds {...props} />
}
