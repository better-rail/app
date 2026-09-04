import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Search } from "lucide-react"
import type { Station } from "@/data/stations"
import { useT } from "@/i18n"
import { cn } from "@/lib/cn"
import { recentRoutes, routePlan } from "@/lib/storage"
import { trackEvent } from "@/lib/analytics"
import { useLocaleParam } from "../locale-link"
import { StationPicker } from "./station-picker"
import { DateTimePicker, type DateTimeValue } from "./date-time-picker"
import { SwapButton } from "./swap-button"

export interface PlannerValue extends DateTimeValue {
  origin?: Station
  destination?: Station
}

export function routeSearchParams(value: DateTimeValue) {
  const search: { date?: string; time?: string } = {}
  if (value.date) search.date = value.date
  if (value.time) search.time = value.time
  return search
}

/** Trip planner: `hero` is the home-page card, `bar` the results toolbar where changes apply immediately. */
export function Planner({
  variant,
  initial,
  today,
  now,
  className,
}: {
  variant: "hero" | "bar"
  initial?: PlannerValue
  today: string
  now: string
  className?: string
}) {
  const t = useT()
  const navigate = useNavigate()
  const locale = useLocaleParam()
  const [value, setValue] = useState<PlannerValue>(initial ?? {})
  const [swapping, setSwapping] = useState(false)
  const [dirty, setDirty] = useState(false)
  const autoNavigate = variant === "bar"

  // Follow `initial` until the user edits the form (URL changes on the toolbar, stored stations on the hero).
  useEffect(() => {
    if (initial && (autoNavigate || !dirty)) setValue(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.origin?.id, initial?.destination?.id, initial?.date, initial?.time, autoNavigate])

  const sameStation = Boolean(value.origin && value.destination && value.origin.id === value.destination.id)
  const ready = Boolean(value.origin && value.destination) && !sameStation

  const go = (next: PlannerValue) => {
    if (!next.origin || !next.destination || next.origin.id === next.destination.id) return
    recentRoutes.add({ originId: next.origin.id, destinationId: next.destination.id })
    trackEvent("route_search", { origin: next.origin.id, destination: next.destination.id, variant })
    navigate({
      to: "/{-$locale}/routes/$from/$to",
      params: { locale, from: next.origin.slug, to: next.destination.slug },
      search: (prev: Record<string, unknown>) => ({ ...(autoNavigate ? prev : {}), ...routeSearchParams(next), trip: undefined }),
    })
  }

  const update = (patch: Partial<PlannerValue>) => {
    const next = { ...value, ...patch }
    setValue(next)
    setDirty(true)
    if ("origin" in patch || "destination" in patch)
      routePlan.set({ originId: next.origin?.id, destinationId: next.destination?.id })
    if (autoNavigate) go(next)
  }

  const swap = () => {
    setSwapping(true)
    setTimeout(() => setSwapping(false), 350)
    update({ origin: value.destination, destination: value.origin })
  }

  if (variant === "bar") {
    return (
      <div className={cn("flex flex-col gap-2 lg:flex-row lg:items-center", className)}>
        <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <StationPicker
            kind="origin"
            variant="field"
            label={t("plan.origin")}
            value={value.origin}
            exclude={value.destination}
            onChange={(origin) => update({ origin })}
          />
          <SwapButton onClick={swap} disabled={!value.origin || !value.destination} horizontal className="size-10" />
          <StationPicker
            kind="destination"
            variant="field"
            label={t("plan.destination")}
            value={value.destination}
            exclude={value.origin}
            onChange={(destination) => update({ destination })}
          />
        </div>
        <DateTimePicker
          compact
          today={today}
          now={now}
          value={value}
          onChange={(dateTime) => update(dateTime)}
          className="lg:w-auto"
        />
      </div>
    )
  }

  return (
    <form
      className={cn("card flex flex-col gap-4 p-4 sm:p-6", className)}
      onSubmit={(event) => {
        event.preventDefault()
        go(value)
      }}
      aria-label={t("plan.title")}
    >
      <div className="relative flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-end lg:gap-3">
        <div className={cn("transition-transform duration-300 ease-out-expo", swapping && "scale-[0.97]")}>
          <StationPicker
            kind="origin"
            label={t("plan.origin")}
            value={value.origin}
            exclude={value.destination}
            onChange={(origin) => update({ origin })}
          />
        </div>
        <div className="absolute end-4 top-1/2 z-10 -translate-y-1/2 lg:static lg:mb-[90px] lg:translate-y-0">
          <SwapButton onClick={swap} disabled={!value.origin || !value.destination} responsive />
        </div>
        <div className={cn("transition-transform duration-300 ease-out-expo", swapping && "scale-[0.97]")}>
          <StationPicker
            kind="destination"
            label={t("plan.destination")}
            value={value.destination}
            exclude={value.origin}
            onChange={(destination) => update({ destination })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <span className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-muted">{t("plan.leaveAt")}</span>
          <DateTimePicker today={today} now={now} value={value} onChange={(dateTime) => setValue({ ...value, ...dateTime })} />
        </div>
        <button
          type="submit"
          disabled={!ready}
          className="btn-primary h-14 w-full text-[17px] lg:w-72"
          title={sameStation ? t("plan.sameStations") : undefined}
        >
          <Search className="size-5" />
          {t("plan.find")}
        </button>
      </div>
      {sameStation && (
        <p role="alert" className="-mt-2 text-center text-[14px] text-danger">
          {t("plan.sameStations")}
        </p>
      )}
    </form>
  )
}
