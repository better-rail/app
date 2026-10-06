import { createFileRoute } from "@tanstack/react-router"
import { Planner } from "@/components/planner/planner"
import { RecentRoutes } from "@/components/routes/recent-routes"
import { getStationById } from "@/data/stations"
import { useT, resolveLocale, translate } from "@/i18n"
import { useStoredRoutePlan } from "@/hooks/use-stored"
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
    <section className="relative overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_0%,color-mix(in_srgb,var(--color-brand)_14%,transparent),transparent_70%)]"
      />
      <div className="container-page relative py-6 sm:py-8 lg:py-10">
        {/* Visually hidden: the planner is the hero, but the page still needs an h1. */}
        <h1 className="sr-only">{t("home.title")}</h1>
        <Planner variant="hero" today={today} now={now} initial={initial} className="relative z-20" />
      </div>
      <RecentRoutes />
    </section>
  )
}
