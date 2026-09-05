import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, Clock, Star, type LucideIcon } from "lucide-react"
import { Planner } from "@/components/planner/planner"
import { LocaleLink } from "@/components/locale-link"
import { DownloadBadges } from "@/components/download-badges"
import { getStationById, stationName, type Station } from "@/data/stations"
import { useLocale, useT, resolveLocale, translate } from "@/i18n"
import { useFavoriteRoutes, useRecentRoutes, useStoredRoutePlan } from "@/hooks/use-stored"
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
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_0%,color-mix(in_srgb,var(--color-brand)_14%,transparent),transparent_70%)]"
        />
        <div className="container-page relative flex flex-col gap-8 py-10 sm:py-14 lg:py-16">
          {/* Visually hidden: the planner is the hero, but the page still needs an h1. */}
          <h1 className="sr-only">{t("home.title")}</h1>
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

/** The routes starred on a results page, plus the last few searches — the home page's shortcuts back into a trip. */
function SavedRoutes() {
  const t = useT()
  const favorites = toPairs(useFavoriteRoutes())
  const recent = toPairs(useRecentRoutes()).filter(
    ([from, to]) => !favorites.some(([f, d]) => f.id === from.id && d.id === to.id),
  )

  if (favorites.length === 0 && recent.length === 0) return null
  return (
    <div className="flex animate-fade-in flex-col gap-4">
      {favorites.length > 0 && <RouteChips title={t("home.favorites")} icon={Star} pairs={favorites} />}
      {recent.length > 0 && <RouteChips title={t("home.recent")} icon={Clock} pairs={recent} />}
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

function RouteChips({ title, icon: Icon, pairs }: { title: string; icon: LucideIcon; pairs: Pair[] }) {
  const locale = useLocale()
  const Arrow = locale === "he" ? ArrowLeft : ArrowRight
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-muted">
        <Icon className="size-3.5" />
        {title}
      </p>
      <ul className="flex flex-wrap gap-2">
        {pairs.map(([from, to]) => (
          <li key={`${from.id}-${to.id}`}>
            <LocaleLink
              to="/{-$locale}/routes/$from/$to"
              params={{ from: from.id, to: to.id }}
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
