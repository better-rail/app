import type { LatLngBoundsExpression } from "leaflet"
import {
  Map,
  MapTileLayer,
  MapMarker,
  MapCircleMarker,
  MapPolyline,
  MapTooltip,
  MapZoomControl,
  MapFitBounds,
  TILE_ATTRIBUTION,
} from "@/components/ui/map"
import { stations, stationName, type Station } from "@/data/stations"
import { useLocale } from "@/i18n"
import { cn } from "@/lib/cn"

const ISRAEL_BOUNDS: LatLngBoundsExpression = [
  [29.45, 34.2],
  [33.35, 35.95],
]

const pin = (color: string) =>
  `<span style="display:block;width:22px;height:22px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgb(0 0 0 / .35)"></span>`

/** Rail network map with the planned journey (origin → stops → destination) highlighted. */
export function RouteMap({ path, className }: { path: Station[]; className?: string }) {
  const locale = useLocale()
  // Zoom buttons go on the side opposite the sidebar.
  const controlsSide = locale === "he" ? "left-3" : "right-3"
  const bounds: LatLngBoundsExpression =
    path.length >= 2
      ? [
          [Math.min(...path.map((s) => s.lat)), Math.min(...path.map((s) => s.lon))],
          [Math.max(...path.map((s) => s.lat)), Math.max(...path.map((s) => s.lon))],
        ]
      : path.length === 1
        ? [
            [path[0].lat - 0.08, path[0].lon - 0.1],
            [path[0].lat + 0.08, path[0].lon + 0.1],
          ]
        : ISRAEL_BOUNDS
  const highlighted = new Set(path.map((s) => s.id))

  return (
    <div className={cn("relative isolate overflow-hidden", className)} dir="ltr">
      <Map bounds={ISRAEL_BOUNDS} scrollWheelZoom={false} className="absolute inset-0">
        <MapTileLayer />
        <MapFitBounds bounds={bounds} options={{ padding: [56, 56], maxZoom: 12 }} />
        {stations
          .filter((station) => !highlighted.has(station.id))
          .map((station) => (
            <MapCircleMarker
              key={station.id}
              center={[station.lat, station.lon]}
              radius={4}
              pathOptions={{ color: "#fff", weight: 1.5, fillColor: "#0a81dd", fillOpacity: 0.7 }}
            >
              <MapTooltip direction="top" offset={[0, -6]}>
                {stationName(station, locale)}
              </MapTooltip>
            </MapCircleMarker>
          ))}
        {path.length >= 2 && (
          <MapPolyline
            positions={path.map((s) => [s.lat, s.lon])}
            pathOptions={{ color: "#0a81dd", weight: 4, opacity: 0.9, lineCap: "round", lineJoin: "round" }}
          />
        )}
        {path.map((station, index) => {
          const isEnd = index === 0 || index === path.length - 1
          return (
            <MapMarker
              key={station.id}
              position={[station.lat, station.lon]}
              icon={pin(index === 0 ? "#0a81dd" : index === path.length - 1 ? "#fa827e" : "#fff")}
              iconSize={isEnd ? [22, 22] : [14, 14]}
              iconAnchor={isEnd ? [11, 11] : [7, 7]}
              zIndexOffset={isEnd ? 1000 : 500}
            >
              <MapTooltip permanent={isEnd} direction="top" offset={[0, isEnd ? -12 : -8]}>
                {stationName(station, locale)}
              </MapTooltip>
            </MapMarker>
          )
        })}
        <div className={cn("absolute top-3 z-[1000]", controlsSide)}>
          <MapZoomControl />
        </div>
      </Map>
      <p
        className={cn(
          "absolute bottom-1.5 z-[1000] rounded bg-surface/80 px-1.5 py-0.5 text-[10px] text-muted backdrop-blur-sm",
          locale === "he" ? "left-2" : "right-2",
        )}
      >
        {TILE_ATTRIBUTION}
      </p>
    </div>
  )
}
