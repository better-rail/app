import { useState, type ReactNode } from "react"
import { AlertTriangle, Ban, Clock, ArrowLeftRight, Expand, Shrink, TrainFront, ChevronDown, ChevronUp } from "lucide-react"
import type { RouteItem, Train } from "@/lib/api/types"
import { exchangeWaitMinutes } from "@/lib/api/route-format"
import { addMinutes, formatClock } from "@/lib/time"
import { formatDuration } from "@/lib/format"
import { stationNameById } from "@/data/stations"
import { useLocale, useT } from "@/i18n"
import { cn } from "@/lib/cn"
import { CancelledBadge, DelayBadge, useChangesText } from "./route-badges"
import { RouteActions } from "./route-actions"

const SAFE_CHANGE_MINUTES = 3

export function RouteDetails({
  route,
  originId,
  destinationId,
  shareUrl,
  className,
}: {
  route: RouteItem
  originId: string
  destinationId: string
  shareUrl: string
  className?: string
}) {
  const t = useT()
  const locale = useLocale()
  const changesText = useChangesText()
  const [showFullRoute, setShowFullRoute] = useState(false)
  const changes = route.trains.length - 1
  const delayedArrival = route.delay > 0 ? addMinutes(route.arrivalTime, route.delay) : undefined

  return (
    <section className={cn("flex flex-col", className)} aria-label={t("details.title")}>
      <header className="border-b border-line/70 px-4 pb-4 pt-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2" dir="ltr">
              <span
                className={cn(
                  "tabular text-[30px] font-bold leading-none tracking-tight",
                  route.isCancelled && "line-through opacity-60",
                )}
              >
                {formatClock(route.departureTime)}
              </span>
              <span className="text-dim">→</span>
              <span
                className={cn(
                  "tabular text-[30px] font-bold leading-none tracking-tight",
                  route.isCancelled && "line-through opacity-60",
                )}
              >
                {formatClock(route.arrivalTime)}
              </span>
              {delayedArrival && <span className="tabular text-[15px] font-bold text-danger">{formatClock(delayedArrival)}</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[14px] text-muted">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-4" />
                {formatDuration(route.durationMs, locale)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{changesText(changes)}</span>
              {route.isCancelled ? <CancelledBadge /> : route.delay > 0 ? <DelayBadge minutes={route.delay} /> : null}
            </div>
          </div>
          <RouteActions route={route} originId={originId} destinationId={destinationId} shareUrl={shareUrl} />
        </div>
      </header>

      <div className="flex flex-col gap-3 px-3 py-4 sm:px-4">
        {route.isMuchLonger && (
          <Callout icon="🕰" tone="warning" title={t("details.longRoute")} text={t("details.longRouteText")} />
        )}

        {route.trains.map((train, index) => (
          <TrainSegment
            key={`${train.trainNumber}-${train.departureTime}`}
            train={train}
            next={route.trains[index + 1]}
            showFullRoute={showFullRoute}
          />
        ))}

        <button
          type="button"
          onClick={() => setShowFullRoute((value) => !value)}
          className="btn-ghost mx-auto mt-1 h-10 gap-2 text-[14px]"
        >
          {showFullRoute ? <Shrink className="size-4" /> : <Expand className="size-4" />}
          {showFullRoute ? t("details.hideAllStations") : t("details.showAllStations")}
        </button>
      </div>
    </section>
  )
}

function TrainSegment({ train, next, showFullRoute }: { train: Train; next?: Train; showFullRoute: boolean }) {
  const t = useT()
  const locale = useLocale()
  const [stopsOpen, setStopsOpen] = useState(true)
  const name = (id: string) => stationNameById(id, locale)

  const originIndex = train.routeStations.findIndex((s) => s.stationId === train.originStationId)
  const destinationIndex = train.routeStations.findIndex((s) => s.stationId === train.destinationStationId)
  const canShowFull = showFullRoute && originIndex !== -1 && destinationIndex !== -1
  const before = canShowFull ? train.routeStations.slice(0, originIndex) : []
  const after = canShowFull ? train.routeStations.slice(destinationIndex + 1) : []

  const warnings: string[] = []
  if (train.originCancelled) warnings.push(t("details.skippedStation", { station: name(train.originStationId) }))
  if (train.destinationCancelled) warnings.push(t("details.skippedStation", { station: name(train.destinationStationId) }))
  if (train.isLastStopChanged) warnings.push(t("details.lastStopChanged", { station: name(train.lastStopId) }))

  return (
    <div className="flex flex-col gap-3">
      {train.isCancelled && (
        <Callout
          icon={<Ban className="size-6" />}
          tone="danger"
          title={t("details.trainCancelled")}
          text={t("details.trainCancelledText")}
        />
      )}
      {!train.isCancelled && warnings.length > 0 && (
        <Callout
          icon={<AlertTriangle className="size-6" />}
          tone="warning"
          title={t("details.routeChanged")}
          text={warnings.join(" ")}
        />
      )}

      <ol className="relative flex flex-col">
        {before.map((station) => (
          <StopRow
            key={`before-${station.stationId}`}
            name={name(station.stationId)}
            time={station.arrivalTime}
            delay={train.delay}
            outside
            cancelled={station.cancelled}
          />
        ))}

        <StationRow
          name={name(train.originStationId)}
          time={formatClock(train.departureTime)}
          delay={train.delay}
          platform={train.originPlatform}
          platformChanged={train.originPlatformChanged}
          trainNumber={train.trainNumber}
          lastStop={name(train.lastStopId)}
          lastStopChanged={train.isLastStopChanged}
          cancelled={train.originCancelled}
          first
        />

        {train.stopStations.length > 0 && (
          <li className="relative ps-[76px]">
            <button
              type="button"
              onClick={() => setStopsOpen((open) => !open)}
              aria-expanded={stopsOpen}
              className="-ms-2 my-0.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-brand-text hover:bg-brand-soft"
            >
              {stopsOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {t("details.stops", { count: train.stopStations.length })}
            </button>
            <TimelineLine />
          </li>
        )}
        {train.stopStations.length === 0 && (
          <li className="relative h-6 ps-[76px] text-[13px] text-dim">
            <span className="block py-0.5">{t("details.noStops")}</span>
            <TimelineLine />
          </li>
        )}
        {stopsOpen &&
          train.stopStations.map((stop) => (
            <StopRow
              key={stop.stationId}
              name={name(stop.stationId)}
              time={formatClock(stop.departureTime)}
              delay={train.delay}
              cancelled={stop.cancelled}
            />
          ))}

        <StationRow
          name={name(train.destinationStationId)}
          time={formatClock(train.arrivalTime)}
          delay={train.delay}
          platform={train.destinationPlatform}
          platformChanged={train.destinationPlatformChanged}
          cancelled={train.destinationCancelled}
          last={after.length === 0}
        />

        {after.map((station, index) => (
          <StopRow
            key={`after-${station.stationId}`}
            name={name(station.stationId)}
            time={station.arrivalTime}
            delay={train.delay}
            outside
            cancelled={station.cancelled}
            last={index === after.length - 1}
          />
        ))}
      </ol>

      {next && <ExchangeBlock first={train} second={next} />}
    </div>
  )
}

function TimelineLine({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("absolute inset-y-0 start-[63px] w-[3px] bg-line-strong", className)} />
}

function StationRow({
  name,
  time,
  delay,
  platform,
  platformChanged,
  trainNumber,
  lastStop,
  lastStopChanged,
  cancelled,
  first,
  last,
}: {
  name: string
  time: string
  delay: number
  platform: number
  platformChanged: boolean
  trainNumber?: number
  lastStop?: string
  lastStopChanged?: boolean
  cancelled?: boolean
  first?: boolean
  last?: boolean
}) {
  const t = useT()
  const delayedTime = delay > 0 ? shiftClock(time, delay) : undefined
  return (
    <li className="relative flex items-start gap-3 rounded-xl bg-surface-2 py-3 pe-3 ps-3">
      <TimelineLine className={cn(first && "top-1/2", last && "bottom-1/2")} />
      <div className="flex w-[44px] shrink-0 flex-col items-end leading-tight" dir="ltr">
        <span
          className={cn("tabular text-[17px] font-bold", (delayedTime || cancelled) && "text-[13px] line-through opacity-60")}
        >
          {time}
        </span>
        {delayedTime && !cancelled && <span className="tabular text-[17px] font-bold text-danger">{delayedTime}</span>}
      </div>
      <span
        aria-hidden="true"
        className="relative z-10 mt-1 flex size-[22px] shrink-0 items-center justify-center rounded-full border-[3px] border-line-strong bg-surface"
      >
        <TrainFront className="size-3 text-text-2" />
      </span>
      <div className="min-w-0 flex-1 leading-snug">
        <p className={cn("text-[16px] font-bold", cancelled && "line-through opacity-60")}>{name}</p>
        <p className="text-[13.5px] text-muted">
          <span className={cn(platformChanged && "font-bold text-danger")}>
            {platform > 0 ? t("details.platform", { platform }) : t("details.noPlatform")}
          </span>
          {trainNumber && <> · {t("details.trainNo", { number: trainNumber })}</>}
        </p>
        {lastStop && (
          <p className="text-[13.5px] text-muted">
            <span className={cn(lastStopChanged && "font-bold text-danger")}>{t("details.lastStop", { station: lastStop })}</span>
          </p>
        )}
      </div>
    </li>
  )
}

function StopRow({
  name,
  time,
  delay,
  outside,
  cancelled,
  last,
}: {
  name: string
  time: string
  delay: number
  outside?: boolean
  cancelled?: boolean
  last?: boolean
}) {
  const delayedTime = delay > 0 ? shiftClock(time, delay) : undefined
  return (
    <li className={cn("relative flex items-center gap-3 py-1.5 pe-3 ps-3", outside && "opacity-60")}>
      <TimelineLine className={cn(last && "bottom-1/2")} />
      <div className="flex w-[44px] shrink-0 flex-col items-end leading-tight" dir="ltr">
        <span
          className={cn("tabular text-[14px] font-semibold", (delayedTime || cancelled) && "text-[11px] line-through opacity-60")}
        >
          {time}
        </span>
        {delayedTime && !cancelled && <span className="tabular text-[14px] font-semibold text-danger">{delayedTime}</span>}
      </div>
      <span
        aria-hidden="true"
        className="relative z-10 size-[14px] shrink-0 rounded-full border-[3px] border-line-strong bg-bg"
      />
      <p className={cn("min-w-0 flex-1 text-[14.5px] font-medium", cancelled && "line-through opacity-60")}>{name}</p>
    </li>
  )
}

function ExchangeBlock({ first, second }: { first: Train; second: Train }) {
  const t = useT()
  const locale = useLocale()
  const wait = exchangeWaitMinutes(first, second)
  const safe = wait >= SAFE_CHANGE_MINUTES
  const samePlatform = first.destinationPlatform === second.originPlatform
  return (
    <div className="flex items-start gap-3 rounded-xl bg-secondary-soft px-4 py-3">
      <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-white">
        <ArrowLeftRight className="size-4" />
      </span>
      <div className="flex flex-col gap-0.5 text-[14.5px]">
        <p className="text-[16px] font-bold">
          {t("details.changeAt", { station: stationNameById(first.destinationStationId, locale) })}
        </p>
        <p>
          {samePlatform
            ? t("details.platformStay", { platform: second.originPlatform })
            : t("details.platformChange", { platform: second.originPlatform })}
        </p>
        <p>{t("details.waitingTime", { duration: formatDuration(wait * 60_000, locale) })}</p>
        {!safe && <p className="font-bold text-danger">{t("details.unsafeChange")}</p>}
      </div>
    </div>
  )
}

function Callout({ icon, title, text, tone }: { icon: ReactNode; title: string; text: string; tone: "warning" | "danger" }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl px-4 py-3",
        tone === "warning" ? "bg-warning-soft text-text" : "bg-danger/10 text-text",
      )}
      role="status"
    >
      <span className={cn("mt-0.5 shrink-0 text-[22px] leading-none", tone === "warning" ? "text-warning" : "text-danger")}>
        {icon}
      </span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-[14px] text-text-2">{text}</p>
      </div>
    </div>
  )
}

/** Adds `minutes` to an `HH:mm` clock string. */
function shiftClock(clock: string, minutes: number): string {
  const [h, m] = clock.split(":").map(Number)
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}
