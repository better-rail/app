import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { Planner } from "@/components/planner/planner"
import { LocaleLink } from "@/components/locale-link"
import { DownloadBadges } from "@/components/download-badges"
import { StationImage } from "@/components/stations/station-image"
import { getStationById, popularRoutes, resolveStation, stationName, type Station } from "@/data/stations"
import { useLocale, useT, resolveLocale, translate } from "@/i18n"
import { useRecentRoutes, useStoredRoutePlan } from "@/hooks/use-stored"
import { dateKey, formatClock, naiveNow } from "@/lib/time"
import { pageHead, jsonLd, websiteJsonLd, organizationJsonLd, mobileAppJsonLd, cacheHeaders } from "@/lib/seo"

type HomeSearch = { from?: string; to?: string }

export const Route = createFileRoute("/{-$locale}/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    from: typeof search.from === "string" ? search.from : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
  }),
  loader: () => {
    const now = naiveNow()
    return { today: dateKey(now), now: formatClock(now) }
  },
  head: ({ params }) => {
    const locale = resolveLocale(params.locale) ?? "he"
    const { meta, links } = pageHead({
      locale,
      path: "/",
      title: translate(locale, "seo.homeTitle"),
      description: translate(locale, "site.description"),
    })
    return { meta, links, scripts: [jsonLd([websiteJsonLd(locale), organizationJsonLd(), mobileAppJsonLd(locale)])] }
  },
  headers: () => cacheHeaders(300, 3600),
  component: HomePage,
})

function HomePage() {
  const t = useT()
  const locale = useLocale()
  const { today, now } = Route.useLoaderData()
  const search = Route.useSearch()
  const stored = useStoredRoutePlan()
  // `?from=&to=` links (station pages) win over the stations remembered from the last visit.
  const initial = {
    origin: resolveStation(search.from) ?? (search.from || search.to ? undefined : getStationById(stored.originId)),
    destination: resolveStation(search.to) ?? (search.from || search.to ? undefined : getStationById(stored.destinationId)),
  }

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_0%,color-mix(in_srgb,var(--color-brand)_14%,transparent),transparent_70%)]"
        />
        <div className="container-page relative flex flex-col gap-8 py-10 sm:py-14 lg:py-16">
          {/* Visually hidden: the planner is the hero, but the page still needs an h1. */}
          <h1 className="sr-only">{t("home.title")}</h1>
          <Planner variant="hero" today={today} now={now} initial={initial} className="relative z-20 shadow-pop" />
          <RecentSearches />
        </div>
      </section>

      <section className="container-page py-10 sm:py-14" aria-labelledby="popular-routes">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="popular-routes" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("home.popular")}
            </h2>
            <p className="mt-1 text-muted">{t("home.popularSubtitle")}</p>
          </div>
          <LocaleLink to="/{-$locale}/stations" className="btn-ghost h-10 gap-1 px-3 text-[15px]">
            {t("home.allStations")}
            {locale === "he" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </LocaleLink>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {popularRoutes.map(([from, to]) => (
            <li key={`${from.id}-${to.id}`}>
              <RouteTile from={from} to={to} />
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line/70 bg-surface-2">
        <div className="container-page grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t("home.appTitle")}</h2>
            <p className="mt-3 text-lg text-muted">{t("home.appSubtitle")}</p>
            <DownloadBadges className="mt-6" />
          </div>
          <picture className="mx-auto w-full max-w-[420px]">
            <source
              type="image/webp"
              srcSet="/assets/images/iphone-screenshot.webp 1x, /assets/images/iphone-screenshot@2x.webp 2x"
            />
            <img
              src="/assets/images/iphone-screenshot.png"
              alt=""
              width={457}
              height={565}
              className="w-full drop-shadow-2xl"
              loading="lazy"
              decoding="async"
            />
          </picture>
        </div>
      </section>
    </>
  )
}

function RecentSearches() {
  const t = useT()
  const locale = useLocale()
  const recent = useRecentRoutes()
  const pairs = recent
    .map((route) => [getStationById(route.originId), getStationById(route.destinationId)] as const)
    .filter((pair): pair is readonly [Station, Station] => Boolean(pair[0] && pair[1]))
  if (pairs.length === 0) return null
  const Arrow = locale === "he" ? ArrowLeft : ArrowRight
  return (
    <div className="animate-fade-in">
      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-muted">
        <Clock className="size-3.5" />
        {t("home.recent")}
      </p>
      <ul className="flex flex-wrap gap-2">
        {pairs.map(([from, to]) => (
          <li key={`${from.id}-${to.id}`}>
            <LocaleLink
              to="/{-$locale}/routes/$from/$to"
              params={{ from: from.slug, to: to.slug }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[14px] font-medium shadow-card transition-colors hover:border-brand/40 hover:text-brand-text"
            >
              {stationName(from, locale)}
              <Arrow className="size-3.5 text-dim" />
              {stationName(to, locale)}
            </LocaleLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RouteTile({ from, to }: { from: Station; to: Station }) {
  const locale = useLocale()
  const Arrow = locale === "he" ? ArrowLeft : ArrowRight
  return (
    <LocaleLink
      to="/{-$locale}/routes/$from/$to"
      params={{ from: from.slug, to: to.slug }}
      className="group relative flex h-28 items-end overflow-hidden rounded-card bg-surface-3 shadow-card transition-[box-shadow,transform] duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <StationImage station={to} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" className="absolute inset-0" />
      <span className="station-photo-gradient absolute inset-0" aria-hidden="true" />
      <span className="relative flex w-full items-center gap-2 p-4 text-white drop-shadow-[0_1px_3px_rgb(0_0_0/0.8)]">
        <span className="text-[17px] font-bold leading-tight">
          {stationName(from, locale)}
          <Arrow className="mx-1.5 inline size-4 opacity-80" />
          {stationName(to, locale)}
        </span>
      </span>
    </LocaleLink>
  )
}
