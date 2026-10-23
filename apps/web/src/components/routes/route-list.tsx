import { Fragment, useCallback, useMemo, ViewTransition } from "react"
import { useNavigate, useRouter } from "@tanstack/react-router"
import { Flag } from "lucide-react"
import { useT } from "@/i18n"
import type { RouteItem } from "@/lib/api/types"
import { isRouteInThePast } from "@/lib/api/route-format"
import type { NaiveTime } from "@/lib/time"
import { useLocaleParam } from "../locale-link"
import { RouteCard } from "./route-card"

const ROUTES_PATH = "/{-$locale}/routes/$from/$to"

/** Where the list marks the arrival time asked for: after the trip that makes it, or before them all when none does. */
export interface ArriveByLine {
  time: string
  afterId: string | null
}

export function RouteList({
  routes,
  from,
  to,
  date,
  time,
  arrive,
  arriveBy,
  selectedId,
  now,
  day,
}: {
  routes: RouteItem[]
  from: string
  to: string
  /** The page's own `date`, `time` and `arrive` search params, which every card's link carries along */
  date?: string
  time?: string
  arrive?: string
  arriveBy?: ArriveByLine
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
        const location = router.buildLocation({
          to: ROUTES_PATH,
          params,
          search: { date, time, arrive, trip: route.id, day },
        })
        return [route.id, router.history.createHref(location.publicHref)]
      }),
    )
  }, [router, locale, from, to, date, time, arrive, day, routes])

  const onSelect = useCallback(
    (route: RouteItem, selected: boolean) =>
      navigate({ search: (prev) => ({ ...prev, trip: route.id, day }), replace: selected, resetScroll: false }),
    [navigate, day],
  )

  return (
    <ol data-day={day} className="flex flex-col gap-3">
      {arriveBy?.afterId === null && <ArriveByMarker time={arriveBy.time} />}
      {/* Animates only in a React transition — the page's deferred slow-trains filter; see `routes.$from.$to.tsx`. */}
      {routes.map((route) => (
        <Fragment key={route.id}>
          <ViewTransition default="route-card">
            <li>
              <RouteCard
                route={route}
                href={hrefs.get(route.id) ?? ""}
                selected={route.id === selectedId}
                isPast={isRouteInThePast(route, now)}
                onSelect={onSelect}
              />
            </li>
          </ViewTransition>
          {arriveBy?.afterId === route.id && <ArriveByMarker time={arriveBy.time} />}
        </Fragment>
      ))}
    </ol>
  )
}

/** The arrival time asked for, drawn across the list: the trips above it get there in time, the ones below don't. */
function ArriveByMarker({ time }: { time: string }) {
  const t = useT()
  const label = t("routes.arriveBy", { time })
  return (
    <ViewTransition default="route-card">
      <li
        data-arrive-by
        role="separator"
        aria-label={label}
        className="-my-0.5 flex items-center gap-2.5 text-[13px] font-semibold text-brand-text"
      >
        <span className="h-0 flex-1 border-t-[1.5px] border-dashed border-brand/50" />
        <span className="flex items-center gap-1.5">
          <Flag className="size-3.5" aria-hidden="true" />
          <span className="tabular">{label}</span>
        </span>
        <span className="h-0 flex-1 border-t-[1.5px] border-dashed border-brand/50" />
      </li>
    </ViewTransition>
  )
}
