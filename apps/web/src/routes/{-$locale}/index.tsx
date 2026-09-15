import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, Clock } from "lucide-react"
import { Planner } from "@/components/planner/planner"
import { LocaleLink } from "@/components/locale-link"
import { DownloadBadges } from "@/components/download-badges"
import { StationImage } from "@/components/stations/station-image"
import { getStationById, stationName, type Station } from "@/data/stations"
import { useLocale, useT, resolveLocale, translate } from "@/i18n"
import { useRecentRoutes, useStoredRoutePlan } from "@/hooks/use-stored"
import { recentRoutes } from "@/lib/storage"
import { dateKey, formatClock, naiveNow } from "@/lib/time"
import { searchString } from "@/lib/search"
import { pageHead, jsonLd, websiteJsonLd, organizationJsonLd, mobileAppJsonLd, cacheHeaders } from "@/lib/seo"

type HomeSearch = { from?: string; to?: string }

export const Route = createFileRoute("/{-$locale}/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    from: searchString(search.from),
    to: searchString(search.to),
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
  const { today, now } = Route.useLoaderData()
  const search = Route.useSearch()
  const stored = useStoredRoutePlan()
  // `?from=&to=` deep links (station ids) win over the stations remembered from the last visit.
  const initial = {
    origin: getStationById(search.from) ?? (search.from || search.to ? undefined : getStationById(stored.originId)),
    destination: getStationById(search.to) ?? (search.from || search.to ? undefined : getStationById(stored.destinationId)),
  }

  return (
    <>
      {/* Fills the first screen below the 60px + 1px-border header so the planner is all you see until you scroll. */}
      <section className="relative flex min-h-[calc(100dvh-61px)] flex-col overflow-x-clip">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_0%,color-mix(in_srgb,var(--color-brand)_14%,transparent),transparent_70%)]"
        />
        <div className="container-page relative flex flex-col gap-8 py-8 sm:py-10 lg:py-12">
          <div className="animate-fade-in">
            <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">{t("home.title")}</h1>
            <p className="mt-1.5 text-[15px] text-muted sm:text-base">{t("home.subtitle")}</p>
          </div>
          <Planner variant="hero" today={today} now={now} initial={initial} className="relative z-20 shadow-pop" />
          <SavedRoutes />
        </div>
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

/** The last few searches — the home page's shortcuts back into a trip. */
function SavedRoutes() {
  const t = useT()
  const locale = useLocale()
  const recent = toPairs(useRecentRoutes()).slice(0, 4)
  if (recent.length === 0) return null
  const Arrow = locale === "he" ? ArrowLeft : ArrowRight
  return (
    <div className="animate-fade-in">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
          <Clock className="size-3.5" />
          {t("home.recent")}
        </p>
        <button
          type="button"
          onClick={recentRoutes.clear}
          className="text-[13px] font-medium text-dim transition-colors hover:text-text-2"
        >
          {t("home.clearRecent")}
        </button>
      </div>
      {/* A single row that scrolls sideways and bleeds to the page edges, instead of pills wrapping into a ragged block. */}
      <ul className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        {recent.map(([from, to]) => (
          <li key={`${from.id}-${to.id}`} className="shrink-0 snap-start">
            <LocaleLink
              to="/{-$locale}/routes/$from/$to"
              params={{ from: from.id, to: to.id }}
              className="group flex w-[220px] items-center gap-3 rounded-2xl border border-line/60 bg-surface p-2 pe-4 shadow-card transition-[transform,box-shadow,border-color] duration-200 ease-out-expo hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-card-hover"
            >
              <span className="size-12 shrink-0 overflow-hidden rounded-xl">
                <StationImage station={to} sizes="48px" />
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[12px] text-muted">{stationName(from, locale)}</span>
                <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[14px] font-semibold">
                  <Arrow className="size-3.5 shrink-0 text-brand" />
                  <span className="truncate">{stationName(to, locale)}</span>
                </span>
              </span>
            </LocaleLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

type Pair = readonly [Station, Station]

/** Drops the entries whose stations the API no longer knows about. */
function toPairs(routes: Array<{ originId: string; destinationId: string }>): Pair[] {
  return routes
    .map((route) => [getStationById(route.originId), getStationById(route.destinationId)] as const)
    .filter((pair): pair is Pair => Boolean(pair[0] && pair[1]))
}
