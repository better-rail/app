import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { StationPhotoCard } from "@/components/stations/station-card"
import { sortedStations, stationName, stations } from "@/data/stations"
import { useLocale, useT, resolveLocale, translate } from "@/i18n"
import { pageHead, jsonLd, breadcrumbJsonLd, cacheHeaders } from "@/lib/seo"
import { useStationSearch } from "@/components/planner/use-station-search"

export const Route = createFileRoute("/{-$locale}/stations/")({
  head: ({ params }) => {
    const locale = resolveLocale(params.locale) ?? "he"
    const { meta, links } = pageHead({
      locale,
      path: "/stations",
      title: translate(locale, "seo.stationsTitle"),
      description: translate(locale, "stations.subtitle", { count: stations.length }),
    })
    return {
      meta,
      links,
      scripts: [
        jsonLd([
          breadcrumbJsonLd(
            [
              { name: translate(locale, "nav.home"), path: "/" },
              { name: translate(locale, "stations.title"), path: "/stations" },
            ],
            locale,
          ),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: translate(locale, "stations.title"),
            numberOfItems: stations.length,
            itemListElement: sortedStations(locale).map((station, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: stationName(station, locale),
              url: `https://better-rail.co.il${locale === "en" ? "/en" : ""}/stations/${station.slug}`,
            })),
          },
        ]),
      ],
    }
  },
  headers: () => cacheHeaders(3600, 86400),
  component: StationsPage,
})

function StationsPage() {
  const t = useT()
  const locale = useLocale()
  const [query, setQuery] = useState("")
  const { results } = useStationSearch(query)
  const all = useMemo(() => sortedStations(locale), [locale])
  const list = query.trim() ? results : all

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t("stations.title")}</h1>
          <p className="mt-2 max-w-2xl text-lg text-muted">{t("stations.subtitle", { count: stations.length })}</p>
        </div>
        <label className="flex h-12 w-full items-center gap-2 rounded-xl border border-line bg-surface px-3.5 shadow-card focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/20 sm:w-72">
          <Search className="size-[18px] shrink-0 text-dim" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("plan.searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-dim"
          />
        </label>
      </header>

      {list.length === 0 && <p className="py-16 text-center text-muted">{t("plan.noResults")}</p>}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((station) => (
          <li key={station.id}>
            <LocaleLink
              to="/{-$locale}/stations/$slug"
              params={{ slug: station.slug }}
              className="group block rounded-card transition-transform duration-300 ease-out-expo hover:-translate-y-0.5"
            >
              <StationPhotoCard
                station={station}
                name={stationName(station, locale)}
                className="h-32 shadow-card group-hover:shadow-card-hover sm:h-36"
              />
            </LocaleLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
