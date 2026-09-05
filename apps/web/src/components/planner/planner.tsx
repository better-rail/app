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

/**
 * Both keys are always present so that merging this over the current search clears a stale `?date=&time=` when the
 * planner is reset back to "now" — TanStack Router drops the undefined ones from the URL.
 */
export function routeSearchParams(value: DateTimeValue) {
  return { date: value.date || undefined, time: value.time || undefined }
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

  /**
   * `keepTrip` leaves the selected trip in the search: a train keeps its id across a date/time change, so the
   * details panel stays open on it when it is still among the results (and falls back to the empty state when it
   * is not). Changing a station makes the trip meaningless, so it is dropped.
   */
  const go = (next: PlannerValue, keepTrip = false) => {
    if (!next.origin || !next.destination || next.origin.id === next.destination.id) return
    recentRoutes.add({ originId: next.origin.id, destinationId: next.destination.id })
    trackEvent("route_search", { origin: next.origin.id, destination: next.destination.id, variant })
    navigate({
      to: "/{-$locale}/routes/$from/$to",
      params: { locale, from: next.origin.id, to: next.destination.id },
      search: (prev: Record<string, unknown>) => ({
        ...(autoNavigate ? prev : {}),
        ...routeSearchParams(next),
        ...(keepTrip ? {} : { trip: undefined }),
      }),
    })
  }

  const update = (patch: Partial<PlannerValue>) => {
    const next = { ...value, ...patch }
    // Compared by id rather than by the patch's keys: the date/time picker echoes the whole value back.
    const stationsChanged = next.origin?.id !== value.origin?.id || next.destination?.id !== value.destination?.id
    setValue(next)
    setDirty(true)
    if (stationsChanged) routePlan.set({ originId: next.origin?.id, destinationId: next.destination?.id })
    if (autoNavigate) go(next, !stationsChanged)
  }

  const swap = () => {
    setSwapping(true)
    setTimeout(() => setSwapping(false), 350)
    update({ origin: value.destination, destination: value.origin })
  }

  if (variant === "bar") {
    return (
      <div className={cn("flex flex-col gap-2 lg:flex-row lg:items-center", className)}>
        {/* Phones stack the two fields with the swap button beside them; from `sm` they sit either side of it. */}
        <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <StationPicker
            kind="origin"
            variant="field"
            label={t("plan.origin")}
            value={value.origin}
            exclude={value.destination}
            onChange={(origin) => update({ origin })}
          />
          <SwapButton
            onClick={swap}
            disabled={!value.origin || !value.destination}
            responsive="sm"
            className="row-span-2 size-10 sm:row-span-1"
          />
          <StationPicker
            kind="destination"
            variant="field"
            label={t("plan.destination")}
            value={value.destination}
            exclude={value.origin}
            onChange={(destination) => update({ destination })}
          />
        </div>
        {/* Phones get the stations only — the toolbar pins over the list, and two more fields cost too much of the
            screen. The day is set from the home planner there, and the list's heading names it. */}
        <div className="hidden sm:block">
          <DateTimePicker
            compact
            today={today}
            now={now}
            value={value}
            onChange={(dateTime) => update(dateTime)}
            className="lg:w-auto"
          />
        </div>
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
        {/* Below `lg` the button straddles the seam between the two cards, as in the app: this zero-height row starts at
            the origin card's bottom edge (the column gap above it is cancelled), and 19px is half of that gap plus the
            destination's label, so the button is centred on the space between the cards. From `lg` it is a
            card-height cell between the two, with the button centred on them. */}
        <div className="relative z-10 -mt-3 h-0 lg:static lg:mt-0 lg:flex lg:h-56 lg:items-center">
          <SwapButton
            onClick={swap}
            disabled={!value.origin || !value.destination}
            responsive="lg"
            className="absolute end-2 top-[19px] size-16 -translate-y-1/2 lg:static lg:size-14 lg:translate-y-0"
          />
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
