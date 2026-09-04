import { createFileRoute, notFound, redirect, useRouterState } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown, Loader2, Star, TrainFront } from "lucide-react"
import { Planner } from "@/components/planner/planner"
import { RouteList } from "@/components/routes/route-list"
import { RouteDetails } from "@/components/routes/route-details"
import { RouteSummaryBox, routeFaq } from "@/components/routes/route-summary"
import { StationImage } from "@/components/stations/station-image"
import { LocaleLink } from "@/components/locale-link"
import { useMapPath } from "@/components/map/map-shell"
import { getStationById, resolveStation, stationName, stationOgImage, type Station } from "@/data/stations"
import { useLocale, useT, resolveLocale, translate, localePath, type Locale } from "@/i18n"
import { routesQueryOptions, ROUTES_REFETCH_INTERVAL_MS } from "@/lib/api/queries"
import { summarizeRoutes, type RouteSummary } from "@/lib/api/route-format"
import type { RouteItem, RoutesResult } from "@/lib/api/types"
import { useHideSlowTrains, useIsFavorite } from "@/hooks/use-stored"
import { useNow } from "@/hooks/use-now"
import {
  addDays,
  dateKey,
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
import { pageHead, jsonLd, breadcrumbJsonLd, faqJsonLd, cacheHeaders, absoluteUrl } from "@/lib/seo"
import { cn } from "@/lib/cn"
import { recentRoutes, routePlan } from "@/lib/storage"

interface RoutesPageSearch {
  date?: string
  time?: string
  trip?: string
}

interface JsonLdTrip {
  departureTime: string
  arrivalTime: string
  trainNumber: number
  changes: number
}

export const Route = createFileRoute("/{-$locale}/routes/$from/$to")({
  validateSearch: (search: Record<string, unknown>): RoutesPageSearch => ({
    date: typeof search.date === "string" && isValidDateKey(search.date) ? search.date : undefined,
    time: typeof search.time === "string" && isValidClock(search.time) ? search.time : undefined,
    trip: typeof search.trip === "string" && search.trip ? search.trip : undefined,
  }),
  loaderDeps: ({ search }) => ({ date: search.date, time: search.time }),
  beforeLoad: ({ params, search }) => {
    const origin = resolveStation(params.from)
    const destination = resolveStation(params.to)
    if (!origin || !destination) throw notFound()
    if (origin.slug !== params.from || destination.slug !== params.to) {
      throw redirect({
        to: "/{-$locale}/routes/$from/$to",
        params: { locale: params.locale, from: origin.slug, to: destination.slug },
        search,
        replace: true,
      })
    }
    if (origin.id === destination.id) {
      throw redirect({ to: "/{-$locale}/stations/$slug", params: { locale: params.locale, slug: origin.slug }, replace: true })
    }
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
    const origin = context.origin ?? resolveStation(params.from)
    const destination = context.destination ?? resolveStation(params.to)
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
  const path = `/routes/${origin.slug}/${destination.slug}`
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
        { name: translate(locale, "stations.title"), path: "/stations" },
        { name: from, path: `/stations/${origin.slug}` },
        { name: translate(locale, "routes.summaryTitle", { from, to }), path },
      ],
      locale,
    ),
  ]
  if (summary) structured.push(faqJsonLd(routeFaq(summary, origin, destination, locale)))
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

  const selected = routes.find((route) => route.id === search.trip)
  const from = stationName(origin, locale)
  const to = stationName(destination, locale)
  const firstDay = naiveFromParts(query.data?.resultDate ?? data.resultDate, "00:00")
  const shareUrl = absoluteUrl(href)
  const Arrow = locale === "he" ? ArrowLeft : ArrowRight

  const closeDetails = () => navigate({ search: (prev) => ({ ...prev, trip: undefined }), resetScroll: false })

  useMapPath(selected ? routePathStations(selected) : [origin, destination])
  // The sidebar scrolls on its own; reset it when toggling details.
  useEffect(() => {
    document.getElementById("map-sidebar")?.scrollTo({ top: 0 })
  }, [search.trip])

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero: the origin station photo, like the app's route header */}
      <div className="relative h-44 shrink-0 overflow-hidden bg-surface-3 sm:h-52 lg:hidden">
        <StationImage station={origin} priority sizes="(min-width: 1024px) 440px, 100vw" className="absolute inset-0" />
        <div
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.55),rgb(0_0_0/0.2)_45%,rgb(0_0_0/0.6))]"
          aria-hidden="true"
        />
        <div className="container-page relative flex h-full flex-col justify-between py-4 text-white lg:mx-0 lg:max-w-none lg:px-4 lg:py-3">
          <nav aria-label="breadcrumb" className="flex items-center gap-2 text-[13px] font-medium opacity-90">
            <LocaleLink to="/{-$locale}" className="link-underline">
              {t("nav.home")}
            </LocaleLink>
            <span aria-hidden="true">/</span>
            <LocaleLink to="/{-$locale}/stations/$slug" params={{ slug: origin.slug }} className="link-underline">
              {from}
            </LocaleLink>
          </nav>
          <div className="flex items-end justify-between gap-4">
            <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight drop-shadow-[0_1px_3px_rgb(0_0_0/0.7)] sm:text-4xl lg:text-[17px]">
              {from}
              <Arrow className="mx-2 inline size-6 opacity-80 sm:size-8 lg:size-5" />
              {to}
            </h1>
            <button
              type="button"
              onClick={toggleFavorite}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? t("routes.unfavorite") : t("routes.favorite")}
              title={isFavorite ? t("routes.unfavorite") : t("routes.favorite")}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-colors hover:bg-white/25 active:scale-95 lg:size-9"
            >
              <Star className={cn("size-5 transition-transform", isFavorite && "fill-yellow-300 text-yellow-300 scale-110")} />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar: text header instead of the photo hero */}
      <div className="hidden items-center justify-between gap-3 px-4 pt-4 lg:flex">
        <p className="min-w-0 truncate text-[17px] font-bold">
          {from}
          <Arrow className="mx-1.5 inline size-4 text-dim" />
          {to}
        </p>
        <button
          type="button"
          onClick={toggleFavorite}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? t("routes.unfavorite") : t("routes.favorite")}
          className="icon-btn size-9 shrink-0"
        >
          <Star className={cn("size-5", isFavorite && "fill-yellow-400 text-yellow-400")} />
        </button>
      </div>

      <div className="container-page relative z-10 -mt-6 lg:mx-0 lg:mt-3 lg:max-w-none lg:px-4">
        <div className="card p-3 sm:p-4 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <Planner
            variant="bar"
            today={dateKey(now)}
            now={formatClock(now)}
            initial={{ origin, destination, date: search.date, time: search.time }}
          />
        </div>
      </div>

      <div
        key={selected ? "details" : "list"}
        className="container-page animate-sidebar-in flex flex-1 flex-col gap-4 py-6 lg:mx-0 lg:max-w-none lg:px-4 lg:py-4"
      >
        {selected ? (
          <div className="card overflow-hidden">
            <button
              type="button"
              onClick={closeDetails}
              className="flex w-full items-center gap-2 border-b border-line/70 px-4 py-3 text-[15px] font-semibold text-brand-text hover:bg-surface-2"
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
          </div>
        ) : (
          <>
            <section aria-label={t("routes.title", { from, to })} className="flex flex-col gap-4">
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
                  text={t("routes.differentDate", {
                    date: formatLongDate(naiveFromParts(query.data.resultDate, "00:00"), locale),
                  })}
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
                  from={origin.slug}
                  to={destination.slug}
                  selectedId={search.trip}
                  now={now}
                  hideSlowTrains={hideSlowTrains}
                />
              )}

              {query.isSuccess && (
                <>
                  {Array.from({ length: extraDays }).map((_, index) => (
                    <ExtraDay
                      key={index}
                      day={addDays(startOfDay(firstDay), index + 1)}
                      origin={origin}
                      destination={destination}
                      selectedId={search.trip}
                      now={now}
                      hideSlowTrains={hideSlowTrains}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setExtraDays((days) => days + 1)}
                    className="btn-ghost h-12 w-full gap-2 border border-dashed border-line-strong text-[15px]"
                  >
                    <ChevronDown className="size-4" />
                    {t("routes.nextDay")}: {formatDayLabel(addDays(startOfDay(firstDay), extraDays + 1), locale, now)}
                  </button>
                </>
              )}
            </section>

            <RouteSummaryBox summary={data.summary} origin={origin} destination={destination} />
          </>
        )}
      </div>
    </div>
  )
}

function routePathStations(route: RouteItem): Station[] {
  const ids = route.trains.flatMap((train) => [
    train.originStationId,
    ...train.stopStations.map((s) => s.stationId),
    train.destinationStationId,
  ])
  return ids
    .filter((id, index) => index === 0 || id !== ids[index - 1])
    .map((id) => getStationById(id))
    .filter((station): station is Station => Boolean(station))
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
  origin,
  destination,
  selectedId,
  now,
  hideSlowTrains,
}: {
  day: NaiveTime
  origin: Station
  destination: Station
  selectedId?: string
  now: NaiveTime
  hideSlowTrains: boolean
}) {
  const t = useT()
  const locale = useLocale()
  const query = useQuery(
    routesQueryOptions({ originId: origin.id, destinationId: destination.id, date: dateKey(day), hour: "12:00" }),
  )
  const routes: RouteItem[] = (query.data?.routes ?? []).filter((route) => dateKey(route.departureTime) === dateKey(day) || true)

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
          from={origin.slug}
          to={destination.slug}
          selectedId={selectedId}
          now={now}
          hideSlowTrains={hideSlowTrains}
        />
      )}
    </section>
  )
}
