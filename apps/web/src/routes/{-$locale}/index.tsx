import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, Clock } from "lucide-react"
import { Planner } from "@/components/planner/planner"
import { LocaleLink } from "@/components/locale-link"
import { DownloadBadges } from "@/components/download-badges"
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
      <section className="relative overflow-x-clip">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_0%,color-mix(in_srgb,var(--color-brand)_14%,transparent),transparent_70%)]"
        />
        <div className="container-page relative flex flex-col gap-8 py-6 sm:py-8 lg:py-10">
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

/** The last few searches as quiet one-line chips: shortcuts back into a trip that leave the planner the focus. */
function SavedRoutes() {
  const t = useT()
  const locale = useLocale()
  const recent = toPairs(useRecentRoutes()).slice(0, 4)
  if (recent.length === 0) return null
  const Arrow = locale === "he" ? ArrowLeft : ArrowRight
  return (
    <div className="animate-fade-in">
      <div className="mb-2 flex items-center gap-2 text-[13px] text-muted">
        <Clock className="size-3.5" />
        <span className="font-semibold">{t("home.recent")}</span>
        <span aria-hidden="true">·</span>
        {/* The vertical padding stretches the tap target to 40px without pushing the chips down. */}
        <button
          type="button"
          onClick={recentRoutes.clear}
          className="-my-2.5 py-2.5 font-medium text-dim transition-colors hover:text-text-2"
        >
          {t("home.clearRecent")}
        </button>
      </div>
      {/* A single row that scrolls sideways and bleeds to the page edges, instead of pills wrapping into a ragged block. */}
      <ul className="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 py-1 sm:-mx-6 sm:px-6">
        {recent.map(([from, to]) => (
          <li key={`${from.id}-${to.id}`} className="shrink-0 snap-start">
            <LocaleLink
              to="/{-$locale}/routes/$from/$to"
              params={{ from: from.id, to: to.id }}
              className="group flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-surface px-4 text-[14px] text-text-2 transition-[box-shadow,scale] duration-200 ease-out-expo hover:ring-1 hover:ring-line-strong active:scale-[0.96]"
            >
              {stationName(from, locale)}
              <Arrow className="size-3.5 shrink-0 text-dim transition-colors group-hover:text-brand" />
              <span className="font-semibold text-text">{stationName(to, locale)}</span>
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
