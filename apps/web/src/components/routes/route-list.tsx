import { useState } from "react"
import { History } from "lucide-react"
import type { RouteItem } from "@/lib/api/types"
import { isRouteInThePast, nextRouteIndex } from "@/lib/api/route-format"
import type { NaiveTime } from "@/lib/time"
import { useT } from "@/i18n"
import { RouteCard } from "./route-card"

export function RouteList({
  routes,
  from,
  to,
  selectedId,
  now,
  hideSlowTrains,
}: {
  routes: RouteItem[]
  from: string
  to: string
  selectedId?: string
  now: NaiveTime
  hideSlowTrains: boolean
}) {
  const t = useT()
  const [showPast, setShowPast] = useState(false)
  const visible = hideSlowTrains ? routes.filter((route) => !route.isMuchLonger || route.id === selectedId) : routes
  const nextIndex = nextRouteIndex(visible, now)
  const pastCount = visible.filter((route) => isRouteInThePast(route, now)).length
  const collapsePast =
    pastCount > 0 &&
    pastCount < visible.length &&
    !showPast &&
    !visible.some((r) => r.id === selectedId && isRouteInThePast(r, now))

  return (
    <ol className="flex flex-col gap-3">
      {collapsePast && (
        <li>
          <button
            type="button"
            onClick={() => setShowPast(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-2.5 text-[14px] font-medium text-muted transition-colors hover:bg-surface-3 hover:text-text"
          >
            <History className="size-4" />
            {t("routes.showPast")} ({pastCount})
          </button>
        </li>
      )}
      {visible.map((route, index) => {
        const isPast = isRouteInThePast(route, now)
        if (collapsePast && isPast) return null
        return (
          <li key={route.id}>
            <RouteCard
              route={route}
              from={from}
              to={to}
              selected={route.id === selectedId}
              isPast={isPast}
              isNext={index === nextIndex}
            />
          </li>
        )
      })}
    </ol>
  )
}
