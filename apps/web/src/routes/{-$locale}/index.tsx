import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Planner, type PlannerValue } from "@/components/planner/planner"
import { useMapPath } from "@/components/map/map-shell"
import { getStationById, resolveStation, type Station } from "@/data/stations"
import { useT, resolveLocale, translate } from "@/i18n"
import { useStoredRoutePlan } from "@/hooks/use-stored"
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
  const { today, now } = Route.useLoaderData()
  const search = Route.useSearch()
  const stored = useStoredRoutePlan()
  const [selection, setSelection] = useState<PlannerValue>({})
  useMapPath([selection.origin, selection.destination].filter((station): station is Station => Boolean(station)))
  // `?from=&to=` links (station pages) win over the stations remembered from the last visit.
  const initial = {
    origin: resolveStation(search.from) ?? (search.from || search.to ? undefined : getStationById(stored.originId)),
    destination: resolveStation(search.to) ?? (search.from || search.to ? undefined : getStationById(stored.destinationId)),
  }

  return (
    <div className="container-page py-8 sm:py-10 lg:mx-0 lg:max-w-none lg:p-4">
      <h1 className="sr-only">{t("home.title")}</h1>
      <Planner
        variant="hero"
        today={today}
        now={now}
        initial={initial}
        onChange={setSelection}
        className="shadow-pop lg:border-0 lg:p-0 lg:shadow-none"
      />
    </div>
  )
}
