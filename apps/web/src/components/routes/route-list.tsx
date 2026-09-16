import { useCallback, useMemo } from "react"
import { useNavigate, useRouter } from "@tanstack/react-router"
import type { RouteItem } from "@/lib/api/types"
import { isRouteInThePast } from "@/lib/api/route-format"
import type { NaiveTime } from "@/lib/time"
import { useLocaleParam } from "../locale-link"
import { RouteCard } from "./route-card"

const ROUTES_PATH = "/{-$locale}/routes/$from/$to"

export function RouteList({
  routes,
  from,
  to,
  date,
  time,
  selectedId,
  now,
  day,
}: {
  routes: RouteItem[]
  from: string
  to: string
  /** The page's own `date` and `time` search params, which every card's link carries along */
  date?: string
  time?: string
  selectedId?: string
  now: NaiveTime
  /** Set on the appended days, so a card's link says which day's trip it selects */
  day?: string
}) {
  const router = useRouter()
  const locale = useLocaleParam()
  const navigate = useNavigate({ from: ROUTES_PATH })

  // Each card links to this page with itself as the trip. Built here, once per list rather than per card per
  // render: the links depend on the day and the requested time, not on which trip is selected, so picking one
  // leaves them as they are.
  const hrefs = useMemo(() => {
    const params = { locale, from, to }
    return new Map(
      routes.map((route) => {
        const location = router.buildLocation({ to: ROUTES_PATH, params, search: { date, time, trip: route.id, day } })
        return [route.id, router.history.createHref(location.publicHref)]
      }),
    )
  }, [router, locale, from, to, date, time, day, routes])

  const onSelect = useCallback(
    (route: RouteItem, selected: boolean) =>
      navigate({ search: (prev) => ({ ...prev, trip: route.id, day }), replace: selected, resetScroll: false }),
    [navigate, day],
  )

  return (
    <ol data-day={day} className="flex flex-col gap-3">
      {routes.map((route) => (
        <li key={route.id}>
          <RouteCard
            route={route}
            href={hrefs.get(route.id) ?? ""}
            selected={route.id === selectedId}
            isPast={isRouteInThePast(route, now)}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ol>
  )
}
