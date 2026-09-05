import { createFileRoute, notFound, useRouterState } from "@tanstack/react-router"
import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown, Loader2, Star, TrainFront } from "lucide-react"
import { Planner } from "@/components/planner/planner"
import { RouteList } from "@/components/routes/route-list"
import { RouteDetails } from "@/components/routes/route-details"
import { StationImage } from "@/components/stations/station-image"
import { getStationById, stationName, stationOgImage, type Station } from "@/data/stations"
import { useLocale, useT, resolveLocale, translate, localePath, type Locale } from "@/i18n"
import { routesQueryOptions, ROUTES_REFETCH_INTERVAL_MS } from "@/lib/api/queries"
import { summarizeRoutes, type RouteSummary } from "@/lib/api/route-format"
import type { RoutesResult } from "@/lib/api/types"
import { useHideSlowTrains, useIsFavorite } from "@/hooks/use-stored"
import { useNow } from "@/hooks/use-now"
import { useFillToFold } from "@/hooks/use-fill-to-fold"
import {
  addDays,
  dateKey,
  daysBetween,
  parseNaive,
  formatClock,
  isValidClock,
  isValidDateKey,
  naiveFromParts,
  naiveNow,
  startOfDay,
  toIsoWithOffset,
  type NaiveTime,
} from "@/lib/time"
import { formatDayLabel, formatDurationLong, formatLongDate, formatNumber } from "@/lib/format"

/** Guards a bogus `day` param from spawning an unbounded number of queries. */
const MAX_EXTRA_DAYS = 7
/** Where the toolbar pins, in pixels — matches its `top-18` class. */
const TOOLBAR_TOP = 72
/** Room left between the pinned toolbar and a card scrolled up under it. */
const CARD_GAP = 16
import { pageHead, jsonLd, breadcrumbJsonLd, cacheHeaders, absoluteUrl, originUrl } from "@/lib/seo"
import { cn } from "@/lib/cn"
import { searchString } from "@/lib/search"
import { recentRoutes, routePlan } from "@/lib/storage"

interface RoutesPageSearch {
  /** First day shown in the list */
  date?: string
  time?: string
  /** Train numbers of the selected journey */
  trip?: string
  /** Service day of the selected journey, when it is not the first day shown */
  day?: string
}

interface JsonLdTrip {
  departureTime: string
  arrivalTime: string
  trainNumber: number
  changes: number
}

export const Route = createFileRoute("/{-$locale}/routes/$from/$to")({
  validateSearch: (search: Record<string, unknown>): RoutesPageSearch => {
    const date = searchString(search.date)
    const time = searchString(search.time)
    const day = searchString(search.day)
    return {
      date: date && isValidDateKey(date) ? date : undefined,
      time: time && isValidClock(time) ? time : undefined,
      trip: searchString(search.trip),
      day: day && isValidDateKey(day) ? day : undefined,
    }
  },
  loaderDeps: ({ search }) => ({ date: search.date, time: search.time }),
  beforeLoad: ({ params }) => {
    const origin = getStationById(params.from)
    const destination = getStationById(params.to)
    if (!origin || !destination || origin.id === destination.id) throw notFound()
    return { origin, destination }
  },
  loader: async ({ context, deps }) => {
    const now = naiveNow()
    const date = deps.date ?? dateKey(now)
    const hour = deps.time ?? formatClock(now)
    const search = { originId: context.origin.id, destinationId: context.destination.id, date, hour }

    let result: RoutesResult | null = null
    try {
      result = await context.queryClient.ensureQueryData(routesQueryOptions(search))
    } catch {
      // The page still renders (with an error state + retry) when the timetable API is unreachable.
    }

    const routes = result?.routes ?? []
    return {
      date,
      hour,
      now,
      summary: summarizeRoutes(routes),
      resultDate: result?.resultDate ?? date,
      trips: routes.slice(0, 40).map<JsonLdTrip>((route) => ({
        departureTime: toIsoWithOffset(route.departureTime),
        arrivalTime: toIsoWithOffset(route.arrivalTime),
        trainNumber: route.trains[0].trainNumber,
        changes: route.trains.length - 1,
      })),
    }
  },
  head: ({ params, loaderData, match }) => {
    const locale = resolveLocale(params.locale) ?? "he"
    const context = match.context as { origin?: Station; destination?: Station }
    const origin = context.origin ?? getStationById(params.from)
    const destination = context.destination ?? getStationById(params.to)
    if (!origin || !destination) return {}
    return routesHead({ locale, origin, destination, summary: loaderData?.summary ?? null, trips: loaderData?.trips ?? [] })
  },
  headers: () => cacheHeaders(60, 600),
  component: RoutesPage,
})

function routesHead({
  locale,
  origin,
  destination,
  summary,
  trips,
}: {
  locale: Locale
  origin: Station
  destination: Station
  summary: RouteSummary | null
  trips: JsonLdTrip[]
}) {
  const from = stationName(origin, locale)
  const to = stationName(destination, locale)
  const path = `/routes/${origin.id}/${destination.id}`
  const description = summary
    ? translate(locale, "seo.routesDescription", {
        from,
        to,
        count: formatNumber(summary.count, locale),
        duration: formatDurationLong(summary.medianDurationMs, locale),
        first: formatClock(summary.firstDeparture),
        last: formatClock(summary.lastDeparture),
      })
    : translate(locale, "seo.routesDescriptionEmpty", { from, to })

  const { meta, links } = pageHead({
    locale,
    path,
    title: translate(locale, "seo.routesTitle", { from, to }),
    description,
    image: stationOgImage(origin),
    imageAlt: translate(locale, "stations.stationTitle", { station: from }),
  })

  const structured: object[] = [
    breadcrumbJsonLd(
      [
        { name: translate(locale, "nav.home"), path: "/" },
        { name: translate(locale, "routes.summaryTitle", { from, to }), path },
      ],
      locale,
    ),
  ]
  if (trips.length > 0) {
    structured.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: translate(locale, "routes.summaryTitle", { from, to }),
      url: absoluteUrl(localePath(locale, path)),
      itemListElement: trips.map((trip, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "TrainTrip",
          trainNumber: String(trip.trainNumber),
          departureStation: { "@type": "TrainStation", name: from },
          arrivalStation: { "@type": "TrainStation", name: to },
          departureTime: trip.departureTime,
          arrivalTime: trip.arrivalTime,
          provider: { "@type": "Organization", name: "Israel Railways" },
        },
      })),
    })
  }

  return { meta, links, scripts: [jsonLd(structured)] }
}

function RoutesPage() {
  const t = useT()
  const locale = useLocale()
  const { origin, destination } = Route.useRouteContext()
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const now = useNow(data.now)
  const [hideSlowTrains, setHideSlowTrains] = useHideSlowTrains()
  const [isFavorite, toggleFavorite] = useIsFavorite({ originId: origin.id, destinationId: destination.id })
  const href = useRouterState({ select: (s) => s.location.href })

  const baseSearch = { originId: origin.id, destinationId: destination.id, date: data.date, hour: data.hour }
  const query = useQuery({ ...routesQueryOptions(baseSearch), refetchInterval: ROUTES_REFETCH_INTERVAL_MS })
  const routes = query.data?.routes ?? []
  const resultType = query.data?.resultType ?? "normal"

  const [extraDays, setExtraDays] = useState(0)
  useEffect(() => setExtraDays(0), [data.date, origin.id, destination.id])
  useEffect(() => {
    recentRoutes.add({ originId: origin.id, destinationId: destination.id })
    routePlan.set({ originId: origin.id, destinationId: destination.id })
  }, [origin.id, destination.id])

  const from = stationName(origin, locale)
  const to = stationName(destination, locale)
  const firstDay = naiveFromParts(query.data?.resultDate ?? data.resultDate, "00:00")

  // Appended days are the ones the reader asked for, plus however many it takes to reach a trip linked from one of
  // them — a shared link opens the day it belongs to instead of an empty details panel.
  const linkedDay = search.day ? daysBetween(firstDay, parseNaive(search.day)) : 0
  const extraDayCount = Math.min(Math.max(extraDays, linkedDay), MAX_EXTRA_DAYS)
  const extraDayDates = Array.from({ length: extraDayCount }, (_, index) => dateKey(addDays(startOfDay(firstDay), index + 1)))
  const extraDayQueries = useQueries({
    queries: extraDayDates.map((date) =>
      routesQueryOptions({ originId: origin.id, destinationId: destination.id, date, hour: "12:00" }),
    ),
  })

  // `day` says which list the trip was picked from; without it the selection belongs to the first day.
  const selectedDayQuery = search.day ? extraDayQueries[extraDayDates.indexOf(search.day)] : query
  const selected = selectedDayQuery?.data?.routes.find((route) => route.id === search.trip)
  const shareUrl = originUrl(href)
  const nextDayLabel = formatDayLabel(addDays(startOfDay(firstDay), extraDayCount + 1), locale, now)
  const Arrow = locale === "he" ? ArrowLeft : ArrowRight

  const closeDetails = () => {
    returnToTrip.current = search.trip
    navigate({ search: (prev) => ({ ...prev, trip: undefined, day: undefined }), resetScroll: false })
  }

  // The toolbar changes height with the viewport (one row on wide screens, two when it wraps), so the details panel
  // reads it from a custom property rather than guessing at an offset that would leave it under the pinned card.
  const toolbarRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const toolbar = toolbarRef.current
    const page = pageRef.current
    if (!toolbar || !page) return
    const measure = () => page.style.setProperty("--toolbar-h", `${toolbar.getBoundingClientRect().height}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(toolbar)
    return () => observer.disconnect()
  }, [])

  const listRef = useRef<HTMLElement>(null)
  const detailsRef = useRef<HTMLDivElement>(null)
  const scrolledToTrip = useRef<string>(undefined)
  /** The trip the reader was just looking at, so closing the details lands back on its card. */
  const returnToTrip = useRef<string>(undefined)

  const paneRef = useRef<HTMLDivElement>(null)
  useFillToFold(paneRef)

  // A link can land on a trip far down the list, and on mobile the list is replaced by the details panel — both
  // need the relevant card brought into view. Cards already on screen are left alone, so picking one never yanks
  // the page around.
  useEffect(() => {
    const trip = search.trip ?? returnToTrip.current
    const list = listRef.current
    if (!trip || !list) return
    if (search.trip && scrolledToTrip.current === search.trip) return

    // Below `lg` the details replace the list, so the panel is what needs to come into view. Read that off the
    // layout rather than a media query, which is still reporting its server value on the first render.
    if (search.trip && list.offsetParent === null) {
      scrolledToTrip.current = search.trip
      const panel = detailsRef.current
      // Measured on the frame after paint and against the toolbar itself: on a cold load the panel would otherwise
      // be positioned before the toolbar has settled, leaving its "back to list" button behind the pinned card.
      if (panel) {
        requestAnimationFrame(() => {
          const offset = TOOLBAR_TOP + (toolbarRef.current?.getBoundingClientRect().height ?? 0) + 8
          window.scrollTo({ top: window.scrollY + panel.getBoundingClientRect().top - offset, behavior: "instant" })
        })
      }
      return
    }

    // Scoped to the day the trip belongs to: train numbers repeat across the days shown on one page.
    const dayList = search.day ? `ol[data-day="${CSS.escape(search.day)}"]` : "ol:not([data-day])"
    const card = list.querySelector(`${dayList} [data-route-id="${CSS.escape(trip)}"]`)
    if (!card) return
    const returning = !search.trip
    scrolledToTrip.current = search.trip
    returnToTrip.current = undefined
    const { top, bottom } = card.getBoundingClientRect()
    if (returning || top < 0 || bottom > window.innerHeight) card.scrollIntoView({ block: "center", behavior: "instant" })
  }, [search.trip, search.day, selectedDayQuery?.data])

  // The API returns the whole day, so a search for tomorrow at 16:00 would otherwise open on the first train of the
  // morning. Once the day's cards are in, the one leaving closest to the requested time is brought up under the
  // toolbar, as the app opens its list — unless it is already on screen, which the next train is for a search for
  // "now". A trip in the link is what the reader was sent to look at, so on arrival that scroll wins instead.
  // Measured a frame later, like the details panel: on a cold load the toolbar may still be re-laying out for the
  // viewport.
  const scrolledToTime = useRef<string>(undefined)
  useEffect(() => {
    const list = listRef.current
    if (!list || !query.data) return
    const key = `${origin.id}-${destination.id}@${data.date}T${data.hour}`
    if (scrolledToTime.current === key) return
    const arriving = scrolledToTime.current === undefined
    scrolledToTime.current = key
    if (arriving && search.trip) return

    const requested = naiveFromParts(data.date, data.hour)
    requestAnimationFrame(() => {
      // Below `lg` the list is hidden while a trip's details are open — nothing to scroll to.
      if (!list.isConnected || list.offsetParent === null) return
      let card: HTMLElement | undefined
      let closest = Infinity
      for (const candidate of Array.from(list.querySelectorAll<HTMLElement>("ol:not([data-day]) [data-route-id]"))) {
        const distance = Math.abs(Number(candidate.dataset.departure) - requested)
        if (distance < closest) {
          card = candidate
          closest = distance
        }
      }
      if (!card) return
      const toolbar = toolbarRef.current?.getBoundingClientRect()
      const { top, bottom } = card.getBoundingClientRect()
      if (top >= (toolbar?.bottom ?? 0) && bottom <= window.innerHeight) return
      const offset = TOOLBAR_TOP + (toolbar?.height ?? 0) + CARD_GAP
      // A jump when the page is new; otherwise the page's own smooth scrolling (which reduced motion turns off).
      window.scrollTo({ top: window.scrollY + top - offset, behavior: arriving ? "instant" : "auto" })
    })
  }, [query.data, data.date, data.hour, origin.id, destination.id, search.trip])

  return (
    <div ref={pageRef} className="flex flex-1 flex-col">
      {/* Hero: the origin station photo, like the app's route header */}
      <div className="relative h-44 overflow-hidden bg-surface-3 sm:h-52 lg:h-56">
        <StationImage station={origin} priority sizes="100vw" className="absolute inset-0" />
        <div
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.55),rgb(0_0_0/0.2)_45%,rgb(0_0_0/0.6))]"
          aria-hidden="true"
        />
        <div className="container-page relative flex h-full flex-col justify-end pb-11 pt-4 text-white">
          <div className="flex items-end justify-between gap-4">
            <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight drop-shadow-[0_1px_3px_rgb(0_0_0/0.7)] sm:text-4xl">
              {from}
              <Arrow className="mx-2 inline size-6 opacity-80 sm:size-8" />
              {to}
            </h1>
            <button
              type="button"
              onClick={toggleFavorite}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? t("routes.unfavorite") : t("routes.favorite")}
              title={isFavorite ? t("routes.unfavorite") : t("routes.favorite")}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-colors hover:bg-white/25 active:scale-95"
            >
              <Star className={cn("size-5 transition-transform", isFavorite && "fill-yellow-300 text-yellow-300 scale-110")} />
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar: overlaps the hero, then pins just below the site header (h-16) once the hero scrolls away */}
      <div ref={toolbarRef} className="container-page sticky top-18 z-20 -mt-6">
        <div className="card p-3 sm:p-4">
          <Planner
            variant="bar"
            today={dateKey(now)}
            now={formatClock(now)}
            initial={{ origin, destination, date: search.date, time: search.time }}
          />
        </div>
      </div>

      <div className="container-page grid flex-1 gap-6 py-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-8 lg:py-8">
        {/* Results list */}
        <section
          ref={listRef}
          aria-label={t("routes.title", { from, to })}
          className={cn("flex flex-col gap-4", selected ? "hidden lg:flex" : "flex")}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-text-2">
              <CalendarDays className="size-4 text-brand" />
              {formatDayLabel(firstDay, locale, now)}
              {query.isFetching && <Loader2 className="size-3.5 animate-spin text-dim" aria-hidden="true" />}
            </h2>
            <label
              className="flex cursor-pointer select-none items-center gap-2 text-[13.5px] text-muted"
              title={t("routes.hideSlowTrainsDescription")}
            >
              <input
                type="checkbox"
                checked={hideSlowTrains}
                onChange={(event) => setHideSlowTrains(event.target.checked)}
                className="size-4 accent-brand"
              />
              {t("routes.hideSlowTrains")}
            </label>
          </div>

          {resultType === "different-date" && query.data && (
            <Notice
              text={t("routes.differentDate", { date: formatLongDate(naiveFromParts(query.data.resultDate, "00:00"), locale) })}
            />
          )}
          {resultType === "different-hour" && <Notice text={t("routes.differentHour")} />}

          {query.isPending && (
            <div className="flex flex-col gap-3" aria-busy="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[104px] animate-pulse rounded-card bg-surface-3" />
              ))}
            </div>
          )}

          {query.isError && (
            <div className="card flex flex-col items-center gap-3 p-8 text-center">
              <p className="text-[15px] text-text-2">{t("routes.error")}</p>
              <button type="button" onClick={() => query.refetch()} className="btn-secondary">
                {t("routes.tryAgain")}
              </button>
            </div>
          )}

          {query.isSuccess && routes.length === 0 && (
            <div className="card flex flex-col items-center gap-3 p-10 text-center text-muted">
              <TrainFront className="size-10 opacity-40" />
              <p>{t("routes.noTrainsFound")}</p>
            </div>
          )}

          {routes.length > 0 && (
            <RouteList
              routes={routes}
              from={origin.id}
              to={destination.id}
              selectedId={search.trip}
              now={now}
              hideSlowTrains={hideSlowTrains}
            />
          )}

          {query.isSuccess && (
            <>
              {extraDayQueries.map((dayQuery, index) => (
                <ExtraDay
                  key={extraDayDates[index]}
                  day={addDays(startOfDay(firstDay), index + 1)}
                  query={dayQuery}
                  origin={origin}
                  destination={destination}
                  selectedId={search.trip}
                  now={now}
                  hideSlowTrains={hideSlowTrains}
                />
              ))}
              <button
                type="button"
                onClick={() => setExtraDays(extraDayCount + 1)}
                aria-label={`${t("routes.nextDay")}: ${nextDayLabel}`}
                className="btn-ghost h-12 w-full gap-2 border border-dashed border-line-strong text-[15px]"
              >
                <ChevronDown className="size-4" />
                {nextDayLabel}
              </button>
            </>
          )}
        </section>

        {/*
         * Details panel (master/detail on desktop, full page on mobile). On desktop the list and the card are two
         * independent panes: this wrapper pins under the toolbar while the list scrolls with the page, and the
         * pane inside it is sized to the fold and scrolls on its own — the card moves in it as one piece, and
         * `overscroll-contain` keeps the wheel from leaking into the list. The pane's own padding (undone by the
         * negative margin) leaves room for the card's shadow inside the clipping box.
         */}
        <div
          ref={detailsRef}
          className={cn(
            selected ? "flex" : "hidden lg:flex",
            "flex-col lg:sticky lg:top-[calc(5rem_+_var(--toolbar-h,5.5rem))] lg:self-start",
          )}
        >
          <div ref={paneRef} className="lg:-m-2 lg:overflow-y-auto lg:overscroll-contain lg:p-2">
            <div className="card overflow-hidden">
              {selected ? (
                <>
                  <button
                    type="button"
                    onClick={closeDetails}
                    className="flex w-full items-center gap-2 border-b border-line/70 px-4 py-3 text-[15px] font-semibold text-brand-text hover:bg-surface-2 lg:hidden"
                  >
                    <Arrow className="size-4 rotate-180" />
                    {t("routes.back")}
                  </button>
                  <RouteDetails
                    key={selected.id}
                    route={selected}
                    originId={origin.id}
                    destinationId={destination.id}
                    shareUrl={shareUrl}
                    className="animate-fade-in"
                  />
                </>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-10 text-center text-muted">
                  <TrainFront className="size-10 opacity-40" />
                  <p className="max-w-xs">{t("routes.selectRoute")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Notice({ text }: { text: string }) {
  return (
    <p role="status" className="rounded-xl bg-warning-soft px-4 py-3 text-[14.5px] font-medium text-text">
      {text}
    </p>
  )
}

function ExtraDay({
  day,
  query,
  origin,
  destination,
  selectedId,
  now,
  hideSlowTrains,
}: {
  day: NaiveTime
  query: UseQueryResult<RoutesResult>
  origin: Station
  destination: Station
  selectedId?: string
  now: NaiveTime
  hideSlowTrains: boolean
}) {
  const t = useT()
  const locale = useLocale()
  const routes = query.data?.routes ?? []

  return (
    <section className="flex flex-col gap-4 border-t border-line/70 pt-4" aria-label={formatDayLabel(day, locale, now)}>
      <h2 className="flex items-center gap-2 text-[15px] font-bold text-text-2">
        <CalendarDays className="size-4 text-brand" />
        {formatDayLabel(day, locale, now)}
        {query.isFetching && <Loader2 className="size-3.5 animate-spin text-dim" aria-hidden="true" />}
      </h2>
      {query.isPending && <div className="h-[104px] animate-pulse rounded-card bg-surface-3" />}
      {query.isError && <p className="text-[14px] text-danger">{t("routes.error")}</p>}
      {query.isSuccess && routes.length === 0 && <p className="text-[14px] text-muted">{t("routes.noTrainsFound")}</p>}
      {query.isSuccess && query.data.resultDate !== dateKey(day) && routes.length > 0 && (
        <Notice
          text={t("routes.differentDate", { date: formatLongDate(naiveFromParts(query.data.resultDate, "00:00"), locale) })}
        />
      )}
      {routes.length > 0 && (
        <RouteList
          routes={routes}
          from={origin.id}
          to={destination.id}
          selectedId={selectedId}
          now={now}
          hideSlowTrains={hideSlowTrains}
          day={dateKey(day)}
        />
      )}
    </section>
  )
}
