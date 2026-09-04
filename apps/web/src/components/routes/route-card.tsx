import type { RouteItem } from "@/lib/api/types"
import { formatClock } from "@/lib/time"
import { formatDuration } from "@/lib/format"
import { useLocale, useT } from "@/i18n"
import { cn } from "@/lib/cn"
import { LocaleLink } from "../locale-link"
import { CancelledBadge, DelayBadge, ShortRouteBadge, SlowTrainBadge, useChangesText } from "./route-badges"

export function RouteCard({
  route,
  from,
  to,
  selected,
  isPast,
  isNext,
}: {
  route: RouteItem
  from: string
  to: string
  selected: boolean
  isPast: boolean
  /** The first train that has not departed yet */
  isNext: boolean
}) {
  const t = useT()
  const locale = useLocale()
  const changesText = useChangesText()
  const changes = route.trains.length - 1
  const firstTrain = route.trains[0]

  return (
    <LocaleLink
      to="/{-$locale}/routes/$from/$to"
      params={{ from, to }}
      search={(prev: Record<string, unknown>) => ({ ...prev, trip: route.id })}
      resetScroll={false}
      replace={selected}
      aria-current={selected ? "true" : undefined}
      data-route-id={route.id}
      className={cn(
        "group relative block rounded-card border bg-surface px-4 py-3 shadow-card transition-[box-shadow,border-color,transform,opacity] duration-200 ease-out-expo hover:shadow-card-hover active:scale-[0.985] lg:px-3 lg:py-2.5",
        selected ? "border-brand ring-2 ring-brand/25" : "border-line/60 hover:border-line-strong",
        isPast && !selected && "opacity-45 hover:opacity-80",
        route.isCancelled && "border-danger/40",
      )}
    >
      {isNext && !isPast && (
        <span className="absolute -top-2.5 start-4 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
          {t("routes.nextTrain")}
        </span>
      )}

      <div className="flex items-center gap-3">
        <TimeColumn
          label={t("routes.departure")}
          time={formatClock(route.departureTime)}
          cancelled={route.isCancelled}
          align="start"
        />

        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
          <span className="text-[15px] font-semibold text-text-2">{formatDuration(route.durationMs, locale)}</span>
          <div className="flex h-1 w-full items-center gap-1" aria-hidden="true">
            <span className="h-[3px] flex-1 rounded-full bg-[repeating-linear-gradient(90deg,var(--color-line-strong)_0_6px,transparent_6px_11px)]" />
            {changes > 0 && <span className="size-2 rounded-full border-2 border-line-strong bg-surface" />}
            <span className="h-[3px] flex-1 rounded-full bg-[repeating-linear-gradient(90deg,var(--color-line-strong)_0_6px,transparent_6px_11px)]" />
          </div>
          <RouteIndicators route={route} changesText={changesText(changes)} />
        </div>

        <TimeColumn label={t("routes.arrival")} time={formatClock(route.arrivalTime)} cancelled={route.isCancelled} align="end" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/60 pt-2 text-[12.5px] text-muted lg:mt-1.5 lg:pt-1.5 lg:text-[12px]">
        <span className={cn(firstTrain.originPlatformChanged && "font-bold text-danger")}>
          {firstTrain.originPlatform > 0
            ? t("details.platform", { platform: firstTrain.originPlatform })
            : t("details.noPlatform")}
        </span>
        <span aria-hidden="true">·</span>
        <span>{t("details.trainNo", { number: firstTrain.trainNumber })}</span>
        {changes > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span>{changesText(changes)}</span>
          </>
        )}
      </div>
    </LocaleLink>
  )
}

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
    <div
      className={cn("flex w-[64px] shrink-0 flex-col leading-none lg:w-[58px]", align === "end" ? "items-end" : "items-start")}
    >
      <span className="mb-1 text-[12px] font-medium text-muted lg:text-[11px]">{label}</span>
      <span
        className={cn("tabular text-[24px] font-bold tracking-tight lg:text-[22px]", cancelled && "line-through opacity-60")}
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
  if (route.delay > 0) badges.push(<DelayBadge key="delay" minutes={route.delay} />)
  if (badges.length === 0) return <span className="text-[13.5px] text-muted">{changesText}</span>
  return <div className="flex flex-wrap items-center justify-center gap-1.5">{badges}</div>
}
