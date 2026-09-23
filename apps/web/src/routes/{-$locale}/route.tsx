import { Outlet, createFileRoute, notFound, redirect, useMatches } from "@tanstack/react-router"
import { resolveLocale } from "@/i18n"
import { SiteLayout } from "@/components/site-layout"

/** Locale prefix layout: `/…` is Hebrew, `/en/…` English; any other first segment is a 404. */
export const Route = createFileRoute("/{-$locale}")({
  beforeLoad: ({ params, location }) => {
    if (params.locale === "he") {
      // Permanent, so crawlers drop the `/he` form rather than keep both.
      throw redirect({ href: location.href.replace(/^\/he(?=\/|$|\?)/, "") || "/", replace: true, statusCode: 308 })
    }
    const locale = resolveLocale(params.locale)
    if (!locale) throw notFound()
    return { locale }
  },
  component: LocaleLayout,
})

function LocaleLayout() {
  const { locale } = Route.useRouteContext()
  const onResultsPage = useMatches({
    select: (matches) => matches.some((match) => match.routeId === "/{-$locale}/routes/$from/$to"),
  })
  return (
    <SiteLayout locale={locale} showHeader={!onResultsPage}>
      <Outlet />
    </SiteLayout>
  )
}
