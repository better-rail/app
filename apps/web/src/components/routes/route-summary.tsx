import type { RouteSummary } from "@/lib/api/route-format"
import { formatClock } from "@/lib/time"
import { formatDurationLong, formatNumber } from "@/lib/format"
import { stationName, suggestedDestinations, type Station } from "@/data/stations"
import { useLocale, useT, translate, type Locale } from "@/i18n"
import { LocaleLink } from "../locale-link"

/** The FAQ entries rendered on the page and mirrored as FAQPage structured data. */
export function routeFaq(summary: RouteSummary, origin: Station, destination: Station, locale: Locale) {
  const from = stationName(origin, locale)
  const to = stationName(destination, locale)
  const duration = formatDurationLong(summary.medianDurationMs, locale)
  return [
    {
      question: translate(locale, "seo.faqDuration", { from, to }),
      answer: translate(locale, "seo.faqDurationAnswer", { from, to, duration }),
    },
    {
      question: translate(locale, "seo.faqCount", { from, to }),
      answer: translate(locale, "seo.faqCountAnswer", {
        from,
        to,
        count: formatNumber(summary.count, locale),
        first: formatClock(summary.firstDeparture),
        last: formatClock(summary.lastDeparture),
      }),
    },
    {
      question: translate(locale, "seo.faqDirect", { from, to }),
      answer:
        summary.directCount > 0
          ? translate(locale, "seo.faqDirectYes", { from, to })
          : translate(locale, "seo.faqDirectNo", { from, to }),
    },
  ]
}

/** Static, crawlable copy about the station pair: facts, FAQ and internal links to related routes. */
export function RouteSummaryBox({
  summary,
  origin,
  destination,
}: {
  summary: RouteSummary | null
  origin: Station
  destination: Station
}) {
  const t = useT()
  const locale = useLocale()
  const from = stationName(origin, locale)
  const to = stationName(destination, locale)
  const related = suggestedDestinations(origin, 8).filter((station) => station.id !== destination.id)

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="route-about">
      <h2 id="route-about" className="text-lg font-bold">
        {t("routes.aboutRoute")}
      </h2>
      {summary ? (
        <>
          <ul className="mt-3 grid gap-2 text-[15px] text-text-2 sm:grid-cols-2">
            <li className="rounded-lg bg-surface-2 px-3 py-2">
              {t("routes.summaryCount", { count: formatNumber(summary.count, locale) })}
            </li>
            <li className="rounded-lg bg-surface-2 px-3 py-2">
              {t("routes.summaryDuration", { duration: formatDurationLong(summary.medianDurationMs, locale) })}
            </li>
            <li className="rounded-lg bg-surface-2 px-3 py-2 tabular">
              {t("routes.summaryFirst", { time: formatClock(summary.firstDeparture) })}
            </li>
            <li className="rounded-lg bg-surface-2 px-3 py-2 tabular">
              {t("routes.summaryLast", { time: formatClock(summary.lastDeparture) })}
            </li>
            <li className="rounded-lg bg-surface-2 px-3 py-2 sm:col-span-2">
              {summary.directCount > 0 ? t("routes.summaryDirect") : t("routes.summaryChanges")}
            </li>
          </ul>
          <h3 className="mt-6 text-[16px] font-bold">{t("seo.faq")}</h3>
          <dl className="mt-2 divide-y divide-line/70">
            {routeFaq(summary, origin, destination, locale).map((item) => (
              <div key={item.question} className="py-3">
                <dt className="font-semibold">{item.question}</dt>
                <dd className="mt-1 text-[15px] text-text-2">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="mt-2 text-[15px] text-muted">{t("seo.routesDescriptionEmpty", { from, to })}</p>
      )}

      <p className="mt-4 text-[13px] text-dim">{t("routes.updatedLive")}</p>

      <h3 className="mt-6 text-[16px] font-bold">{t("routes.otherDestinations", { station: from })}</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        <li>
          <LocaleLink
            to="/{-$locale}/routes/$from/$to"
            params={{ from: destination.slug, to: origin.slug }}
            className="badge bg-brand-soft px-3 py-1.5 text-[14px] text-brand-text hover:bg-brand/20"
          >
            {t("routes.reverse")}: {to} ← {from}
          </LocaleLink>
        </li>
        {related.map((station) => (
          <li key={station.id}>
            <LocaleLink
              to="/{-$locale}/routes/$from/$to"
              params={{ from: origin.slug, to: station.slug }}
              className="badge bg-surface-3 px-3 py-1.5 text-[14px] text-text-2 hover:bg-line"
            >
              {stationName(station, locale)}
            </LocaleLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
