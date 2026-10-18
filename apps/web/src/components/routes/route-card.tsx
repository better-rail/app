import { memo, type MouseEvent } from "react"
import type { RouteItem } from "@/lib/api/types"
import { formatClock } from "@/lib/time"
import { formatDuration } from "@/lib/format"
import { useLocale, useT } from "@/i18n"
import { cn } from "@/lib/cn"
import { CancelledBadge, DelayBadge, ShortRouteBadge, SlowTrainBadge, useChangesText } from "./route-badges"

/**
 * A plain anchor rather than the router's `Link`, and memoised: a day lists a couple of hundred of these, and a
 * `Link` apiece meant every one of them re-rendered, rebuilt its location and preloaded the route on hover for
 * each trip picked. The href comes ready-made from the list, and a plain click hands the trip back to it.
 */
export const RouteCard = memo(function RouteCard({
  route,
  href,
  selected,
  isPast,
  onSelect,
}: {
  route: RouteItem
  href: string
  selected: boolean
  isPast: boolean
  onSelect: (route: RouteItem, selected: boolean) => void
}) {
  const t = useT()
  const locale = useLocale()
  const changesText = useChangesText()
  const changes = route.trains.length - 1

  // Modified and non-primary clicks are the browser's (a new tab, say), as they would be on any link.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onSelect(route, selected)
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      aria-current={selected ? "true" : undefined}
      data-past={(isPast && !selected) || undefined}
      data-route-id={route.id}
      data-departure={route.departureTime}
      className={cn(
        "group relative block rounded-card border bg-surface px-4 py-3 shadow-card transition-[box-shadow,border-color,transform] duration-200 ease-out-expo hover:shadow-card-hover active:scale-[0.985]",
        selected ? "border-brand ring-2 ring-brand/25" : "border-line/60 hover:border-line-strong",
        route.isCancelled && "border-danger/40",
      )}
    >
      {/* The greyed-out times are all that marks a trip gone by; this says it out loud. */}
      {isPast && <span className="sr-only">{t("a11y.departed")}, </span>}
      <div className="flex items-center gap-3">
        <TimeColumn
          label={t("routes.departure")}
          time={formatClock(route.departureTime)}
          cancelled={route.isCancelled}
          align="start"
        />

        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
          <span className="text-[15px] font-semibold text-text-2 group-data-past:text-muted">
            {formatDuration(route.durationMs, locale)}
          </span>
          <div className="flex h-1 w-full items-center gap-1" aria-hidden="true">
            <span className="h-[3px] flex-1 rounded-full bg-[repeating-linear-gradient(90deg,var(--color-line-strong)_0_6px,transparent_6px_11px)]" />
            {changes > 0 && <span className="size-2 rounded-full border-2 border-line-strong bg-surface" />}
            <span className="h-[3px] flex-1 rounded-full bg-[repeating-linear-gradient(90deg,var(--color-line-strong)_0_6px,transparent_6px_11px)]" />
          </div>
          <RouteIndicators route={route} changesText={changesText(changes)} />
        </div>

        <TimeColumn label={t("routes.arrival")} time={formatClock(route.arrivalTime)} cancelled={route.isCancelled} align="end" />
      </div>
    </a>
  )
})

function TimeColumn({
  label,
  time,
  cancelled,
  align,
}: {
  label: string
  time: string
  cancelled: boolean
  align: "start" | "end"
}) {
  return (
    <div className={cn("flex w-[64px] shrink-0 flex-col leading-none", align === "end" ? "items-end" : "items-start")}>
      <span className="mb-1 text-[12px] font-medium text-muted">{label}</span>
      <span
        className={cn(
          "tabular text-[24px] font-bold tracking-tight",
          cancelled ? "line-through opacity-60" : "group-data-past:text-muted",
        )}
        dir="ltr"
      >
        {time}
      </span>
    </div>
  )
}

function RouteIndicators({ route, changesText }: { route: RouteItem; changesText: string }) {
  if (route.isCancelled) return <CancelledBadge />
  const badges = []
  if (route.isMuchShorter && !route.isMuchLonger) badges.push(<ShortRouteBadge key="short" />)
  if (route.isMuchLonger) badges.push(<SlowTrainBadge key="slow" />)
  const delay = Math.max(route.delay, route.arrivalDelay)
  if (delay > 0) badges.push(<DelayBadge key="delay" minutes={delay} />)
  if (badges.length === 0) return <span className="text-[13.5px] text-muted">{changesText}</span>
  return <div className="flex flex-wrap items-center justify-center gap-1.5">{badges}</div>
}
