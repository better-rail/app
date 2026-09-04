import { createFileRoute, notFound, redirect } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, MapPin, Navigation } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { StationImage } from "@/components/stations/station-image"
import {
  nearbyStations,
  resolveStation,
  sortedStations,
  stationName,
  stationOgImage,
  suggestedDestinations,
  distanceKm,
} from "@/data/stations"
import { useLocale, useT, resolveLocale, translate, localePath } from "@/i18n"
import { pageHead, jsonLd, breadcrumbJsonLd, cacheHeaders, absoluteUrl } from "@/lib/seo"

export const Route = createFileRoute("/{-$locale}/stations/$slug")({
  beforeLoad: ({ params }) => {
    const station = resolveStation(params.slug)
    if (!station) throw notFound()
    if (station.slug !== params.slug) {
      throw redirect({ to: "/{-$locale}/stations/$slug", params: { locale: params.locale, slug: station.slug }, replace: true })
    }
    return { station }
  },
  loader: ({ context }) => ({ stationId: context.station.id }),
  head: ({ params, match }) => {
    const locale = resolveLocale(params.locale) ?? "he"
    const station = (match.context as { station?: ReturnType<typeof resolveStation> }).station ?? resolveStation(params.slug)
    if (!station) return {}
    const name = stationName(station, locale)
    const { meta, links } = pageHead({
      locale,
      path: `/stations/${station.slug}`,
      title: translate(locale, "seo.stationTitle", { station: name }),
      description: translate(locale, "seo.stationDescription", { station: name }),
      image: stationOgImage(station),
      imageAlt: translate(locale, "stations.stationTitle", { station: name }),
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
              { name, path: `/stations/${station.slug}` },
            ],
            locale,
          ),
          {
            "@context": "https://schema.org",
            "@type": "TrainStation",
            name,
            alternateName: locale === "he" ? station.english : station.hebrew,
            url: absoluteUrl(localePath(locale, `/stations/${station.slug}`)),
            image: stationOgImage(station) ? absoluteUrl(stationOgImage(station)!) : undefined,
            geo: { "@type": "GeoCoordinates", latitude: station.lat, longitude: station.lon },
            address: { "@type": "PostalAddress", addressCountry: "IL" },
          },
        ]),
      ],
    }
  },
  headers: () => cacheHeaders(3600, 86400),
  component: StationPage,
})

function StationPage() {
  const t = useT()
  const locale = useLocale()
  const { station } = Route.useRouteContext()
  const name = stationName(station, locale)
  const suggestions = suggestedDestinations(station, 8)
  const nearby = nearbyStations(station, 4)
  const others = sortedStations(locale).filter((other) => other.id !== station.id)
  const Arrow = locale === "he" ? ArrowLeft : ArrowRight
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lon}`
  const wazeUrl = `https://waze.com/ul?ll=${station.lat},${station.lon}&navigate=yes`

  return (
    <article>
      <div className="relative h-56 w-full overflow-hidden bg-surface-3 sm:h-72 lg:h-80">
        <StationImage station={station} priority sizes="100vw" className="absolute inset-0" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.15),rgb(0_0_0/0.7))]" aria-hidden="true" />
        <div className="container-page relative flex h-full flex-col justify-end pb-6 text-white">
          <nav aria-label="breadcrumb" className="mb-2 text-[13px] font-medium opacity-90">
            <LocaleLink to="/{-$locale}/stations" className="link-underline">
              {t("stations.title")}
            </LocaleLink>
          </nav>
          <h1 className="text-balance text-3xl font-bold tracking-tight drop-shadow-[0_1px_3px_rgb(0_0_0/0.7)] sm:text-5xl">
            {t("stations.stationTitle", { station: name })}
          </h1>
          <p className="mt-1 text-[15px] opacity-90 sm:text-lg" dir="auto">
            {locale === "he" ? station.english : station.hebrew}
          </p>
        </div>
      </div>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
        <div className="flex flex-col gap-10">
          <section aria-labelledby="popular-destinations">
            <h2 id="popular-destinations" className="text-2xl font-bold tracking-tight">
              {t("stations.popularDestinations")}
            </h2>
            <p className="mt-1 text-muted">{t("stations.stationSubtitle", { station: name })}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {suggestions.map((destination) => (
                <li key={destination.id}>
                  <LocaleLink
                    to="/{-$locale}/routes/$from/$to"
                    params={{ from: station.slug, to: destination.slug }}
                    className="group flex items-center gap-3 rounded-card border border-line/60 bg-surface p-3 shadow-card transition-[box-shadow,border-color] hover:border-brand/40 hover:shadow-card-hover"
                  >
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                      <StationImage station={destination} sizes="112px" className="absolute inset-0" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[16px] font-bold">{stationName(destination, locale)}</span>
                      <span className="text-[13px] text-muted">
                        {Math.round(distanceKm(station, destination))} {locale === "he" ? "ק״מ" : "km"}
                      </span>
                    </span>
                    <Arrow className="size-5 text-dim transition-transform group-hover:translate-x-[var(--nudge)] [dir=rtl]:[--nudge:-3px] [dir=ltr]:[--nudge:3px]" />
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="all-destinations">
            <h2 id="all-destinations" className="text-2xl font-bold tracking-tight">
              {t("stations.allDestinations")}
            </h2>
            <ul className="mt-4 grid gap-x-6 gap-y-1.5 text-[15px] sm:grid-cols-2 lg:grid-cols-3">
              {others.map((destination) => (
                <li key={destination.id}>
                  <LocaleLink
                    to="/{-$locale}/routes/$from/$to"
                    params={{ from: station.slug, to: destination.slug }}
                    className="link-underline text-text-2 hover:text-brand-text"
                  >
                    {name} <Arrow className="mx-0.5 inline size-3 text-dim" /> {stationName(destination, locale)}
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="card p-5">
            <h2 className="text-lg font-bold">{t("nav.plan")}</h2>
            <div className="mt-3 flex flex-col gap-2">
              <LocaleLink to="/{-$locale}" search={{ from: station.slug }} className="btn-primary w-full">
                {t("stations.planFrom", { station: name })}
              </LocaleLink>
              <LocaleLink to="/{-$locale}" search={{ to: station.slug }} className="btn-secondary w-full">
                {t("stations.planTo", { station: name })}
              </LocaleLink>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <MapPin className="size-5 text-brand" />
              {t("stations.map")}
            </h2>
            <div className="mt-3 flex flex-col gap-2 text-[15px]">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="link-underline w-fit text-brand-text">
                {t("stations.googleMaps")}
              </a>
              <a
                href={wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link-underline flex w-fit items-center gap-1 text-brand-text"
              >
                <Navigation className="size-4" />
                {t("stations.waze")}
              </a>
              <p className="tabular text-[13px] text-dim" dir="ltr">
                {station.lat.toFixed(5)}, {station.lon.toFixed(5)}
              </p>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-bold">{t("stations.nearby")}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {nearby.map((other) => (
                <li key={other.id}>
                  <LocaleLink
                    to="/{-$locale}/stations/$slug"
                    params={{ slug: other.slug }}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[15px] hover:bg-surface-3"
                  >
                    <span className="font-medium">{stationName(other, locale)}</span>
                    <span className="text-[13px] text-muted">
                      {Math.round(distanceKm(station, other))} {locale === "he" ? "ק״מ" : "km"}
                    </span>
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[13px] text-dim">
            <LocaleLink to="/image-attributions" className="link-underline">
              {t("stations.photoCredit")}
            </LocaleLink>
          </p>
        </aside>
      </div>
    </article>
  )
}
