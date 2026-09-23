import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Loader2, Search } from "lucide-react"
import type { Station } from "@/data/stations"
import { useT } from "@/i18n"
import { cn } from "@/lib/cn"
import { recentRoutes, routePlan } from "@/lib/storage"
import { trackEvent } from "@/lib/analytics"
import { useNow } from "@/hooks/use-now"
import { dateKey, formatClock, naiveFromParts } from "@/lib/time"
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

/** The swap's glide: the cards leave and land gently, like two things physically trading places. */
const SWAP_EASING = "cubic-bezier(0.65, 0, 0.35, 1)"

/** Trip planner: `hero` is the home card; `results` applies changes immediately. */
export function Planner({
  variant,
  initial,
  today: loadedToday,
  now: loadedNow,
  className,
}: {
  variant: "hero" | "results"
  initial?: PlannerValue
  today: string
  now: string
  className?: string
}) {
  const t = useT()
  const navigate = useNavigate()
  const locale = useLocaleParam()
  // The loader's clock is baked into edge-cached HTML, so it is only a seed: `useNow` corrects it after hydration and
  // keeps it ticking, which is what makes the "Today" label and the calendar's minimum survive midnight and a long visit.
  const nowNaive = useNow(naiveFromParts(loadedToday, loadedNow))
  const today = dateKey(nowNaive)
  const now = formatClock(nowNaive)
  const [value, setValue] = useState<PlannerValue>(initial ?? {})
  const originCard = useRef<HTMLSpanElement>(null)
  const destinationCard = useRef<HTMLSpanElement>(null)
  const swapAnimations = useRef<Animation[]>([])
  /** The hero form has been sent and the results page is still loading — the button says so and locks meanwhile. */
  const [submitting, setSubmitting] = useState(false)
  const [dirty, setDirty] = useState(false)
  const autoNavigate = variant !== "hero"

  // Follow `initial` until the user edits the form (URL changes on results, stored stations on the hero). Merged
  // rather than replaced: the hero's `initial` carries stations only, and a date the user picked has to survive it.
  useEffect(() => {
    if (initial && (autoNavigate || !dirty)) setValue((current) => ({ ...current, ...initial }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.origin?.id, initial?.destination?.id, initial?.date, initial?.time, autoNavigate])

  const sameStation = Boolean(value.origin && value.destination && value.origin.id === value.destination.id)
  const ready = Boolean(value.origin && value.destination) && !sameStation

  /**
   * `keepTrip` leaves the selected trip in the search: a train keeps its id across a date/time change, so the
   * details panel stays open on it when it is still among the results (and falls back to the empty state when it
   * is not). Changing a station makes the trip (and the `?day=` it was picked from) meaningless, so both are dropped.
   *
   * `record` marks a trip the user actually planned — a new pair of stations, or the hero's submit — as opposed to a
   * date or time nudged on the results toolbar, which must not re-record the route or count as another search.
   */
  const go = (next: PlannerValue, keepTrip = false, record = true) => {
    if (!next.origin || !next.destination || next.origin.id === next.destination.id) return
    if (record) {
      recentRoutes.add({ originId: next.origin.id, destinationId: next.destination.id })
      trackEvent("route_search", { origin: next.origin.id, destination: next.destination.id, variant })
    }
    // Settles once the results page has loaded: the router keeps this page on screen until then.
    return navigate({
      to: "/{-$locale}/routes/$from/$to",
      params: { locale, from: next.origin.id, to: next.destination.id },
      search: (prev: Record<string, unknown>) => ({
        ...(autoNavigate ? prev : {}),
        ...routeSearchParams(next),
        ...(keepTrip ? {} : { trip: undefined, day: undefined }),
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
    if (autoNavigate) go(next, !stationsChanged, stationsChanged)
  }

  /** The photo cards trade places, each gliding home from where the other is on screen — mid-flight too. */
  const swap = () => {
    const origin = originCard.current
    const destination = destinationCard.current
    // Web Animations skip the stylesheet's reduced-motion rule, so it is checked here.
    if (origin && destination && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const starts = [destination.getBoundingClientRect(), origin.getBoundingClientRect()]
      for (const animation of swapAnimations.current) animation.cancel()
      swapAnimations.current = [origin, destination].map((card, index) => {
        const start = starts[index]
        const home = card.getBoundingClientRect()
        const x = start.x + start.width / 2 - (home.x + home.width / 2)
        const y = start.y + start.height / 2 - (home.y + home.height / 2)
        return card.animate(
          [
            { translate: `${x}px ${y}px`, scale: start.width / home.width, easing: SWAP_EASING },
            { scale: index === 0 ? 0.94 : 1.02, offset: 0.5, easing: SWAP_EASING },
            { translate: "0 0", scale: 1 },
          ],
          Math.min(450, 280 + Math.hypot(x, y) / 4),
        )
      })
    }
    update({ origin: value.destination, destination: value.origin })
  }

  if (variant === "results") {
    return (
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 lg:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)_minmax(330px,1.5fr)] lg:gap-3",
          className,
        )}
      >
        <div className="relative col-span-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 lg:col-span-3 lg:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] lg:gap-3">
          <StationPicker
            kind="origin"
            variant="header"
            label={t("plan.origin")}
            value={value.origin}
            exclude={value.destination}
            cardRef={originCard}
            onChange={(origin) => update({ origin })}
          />
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center lg:pointer-events-auto lg:static">
            <SwapButton
              onClick={swap}
              disabled={!value.origin || !value.destination}
              horizontal
              className="pointer-events-auto size-10 border-2 border-bg"
            />
          </div>
          <StationPicker
            kind="destination"
            variant="header"
            label={t("plan.destination")}
            value={value.destination}
            exclude={value.origin}
            cardRef={destinationCard}
            onChange={(destination) => update({ destination })}
          />
        </div>
        <div className="col-span-2 min-w-0 lg:col-span-1">
          <span className="sr-only">{t("plan.leaveAt")}</span>
          <DateTimePicker
            today={today}
            now={now}
            value={value}
            onChange={(dateTime) => update(dateTime)}
            dense
            className="w-full"
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
        if (submitting) return
        const navigation = go(value)
        if (!navigation) return
        setSubmitting(true)
        // The planner is normally gone by the time this settles; if the page is still here, the button is given back.
        navigation.finally(() => setSubmitting(false))
      }}
      aria-label={t("plan.title")}
    >
      <div className="relative flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-end lg:gap-3">
        <StationPicker
          kind="origin"
          label={t("plan.origin")}
          value={value.origin}
          exclude={value.destination}
          cardRef={originCard}
          onChange={(origin) => update({ origin })}
        />
        {/* Below `lg` the button straddles the seam between the two cards, as in the app: this zero-height row starts at
            the origin card's bottom edge (the column gap above it is cancelled), and 19px is half of that gap plus the
            destination's label, so the button is centred on the space between the cards. From `lg` it is a
            card-height cell between the two, with the button centred on them. */}
        <div className="relative z-10 -mt-3 h-0 lg:mt-0 lg:flex lg:h-56 lg:items-center">
          <SwapButton
            onClick={swap}
            disabled={!value.origin || !value.destination}
            responsive="lg"
            className="absolute end-2 top-[19px] size-16 -translate-y-1/2 lg:static lg:size-14 lg:translate-y-0"
          />
        </div>
        <StationPicker
          kind="destination"
          label={t("plan.destination")}
          value={value.destination}
          exclude={value.origin}
          cardRef={destinationCard}
          onChange={(destination) => update({ destination })}
        />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <span className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-muted">{t("plan.leaveAt")}</span>
          {/* Through `update` like the stations: it marks the form dirty, so the stored plan can no longer overwrite
              the day the user just picked. Nothing is persisted or navigated — the stations haven't changed. */}
          <DateTimePicker today={today} now={now} value={value} onChange={(dateTime) => update(dateTime)} />
        </div>
        <button
          type="submit"
          disabled={!ready || submitting}
          aria-busy={submitting}
          className={cn("btn-primary h-14 w-full text-[17px] lg:w-72", submitting && "disabled:opacity-85")}
          title={sameStation ? t("plan.sameStations") : undefined}
        >
          {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Search className="size-5" />}
          {submitting ? t("routes.loading") : t("plan.find")}
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
