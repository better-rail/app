import type { RouteItem } from "@/lib/api/types"
import { isRouteInThePast } from "@/lib/api/route-format"
import type { NaiveTime } from "@/lib/time"
import { RouteCard } from "./route-card"

export function RouteList({
  routes,
  from,
  to,
  selectedId,
  now,
  hideSlowTrains,
  day,
}: {
  routes: RouteItem[]
  from: string
  to: string
  selectedId?: string
  now: NaiveTime
  hideSlowTrains: boolean
  /** Set on the appended days — see `RouteCard` */
  day?: string
}) {
  const visible = hideSlowTrains ? routes.filter((route) => !route.isMuchLonger || route.id === selectedId) : routes

  return (
    <ol data-day={day} className="flex flex-col gap-3">
      {visible.map((route) => (
        <li key={route.id}>
          <RouteCard
            route={route}
            from={from}
            to={to}
            selected={route.id === selectedId}
            isPast={isRouteInThePast(route, now)}
            day={day}
          />
        </li>
      ))}
    </ol>
  )
}
