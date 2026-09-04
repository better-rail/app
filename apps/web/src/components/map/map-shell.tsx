import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useMatches } from "@tanstack/react-router"
import type { Station } from "@/data/stations"
import { RouteMap } from "./route-map"

const MapPathContext = createContext<(path: Station[]) => void>(() => {})

/** Publishes the stations to highlight on the desktop map (origin → stops → destination). */
export function useMapPath(path: Station[]) {
  const setPath = useContext(MapPathContext)
  const key = path.map((s) => s.id).join(",")
  useEffect(() => {
    setPath(path)
    return () => setPath([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setPath])
}

/** Desktop: full-screen map with the route content in a floating sidebar; below `lg` only the content renders. */
export function MapShell({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<Station[]>([])
  // Re-key per route so the entrance animation replays.
  const leafRouteId = useMatches({ select: (matches) => matches[matches.length - 1]?.routeId ?? "" })
  return (
    <MapPathContext.Provider value={setPath}>
      <div className="relative flex flex-1 flex-col lg:h-[calc(100dvh-4rem)] lg:overflow-hidden">
        <RouteMap path={path} className="hidden lg:absolute lg:inset-0 lg:block" />
        <div
          id="map-sidebar"
          className="flex flex-1 flex-col lg:absolute lg:top-4 lg:bottom-4 lg:start-4 lg:z-[500] lg:w-[400px] lg:overflow-y-auto lg:rounded-2xl lg:bg-surface lg:shadow-pop xl:w-[440px]"
        >
          <div key={leafRouteId} className="animate-sidebar-in flex flex-1 flex-col">
            {children}
          </div>
        </div>
      </div>
    </MapPathContext.Provider>
  )
}
