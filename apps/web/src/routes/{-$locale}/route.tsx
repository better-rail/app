import { Outlet, createFileRoute, notFound, redirect, useMatches } from "@tanstack/react-router"
import { resolveLocale } from "@/i18n"
import { SiteLayout } from "@/components/site-layout"
import { MapShell } from "@/components/map/map-shell"

const MAP_ROUTES = ["/{-$locale}/", "/{-$locale}/routes/$from/$to"]

/** Locale prefix layout: `/…` is Hebrew, `/en/…` English; any other first segment is a 404. */
export const Route = createFileRoute("/{-$locale}")({
  beforeLoad: ({ params, location }) => {
    if (params.locale === "he") {
      throw redirect({ href: location.href.replace(/^\/he(?=\/|$|\?)/, "") || "/", replace: true })
    }
    const locale = resolveLocale(params.locale)
    if (!locale) throw notFound()
    return { locale }
  },
  component: LocaleLayout,
})

function LocaleLayout() {
  const { locale } = Route.useRouteContext()
  const isMapPage = useMatches({ select: (matches) => matches.some((match) => MAP_ROUTES.includes(match.routeId)) })
  return (
    <SiteLayout locale={locale} footer={isMapPage ? "mobile-only" : true}>
      {isMapPage ? (
        <MapShell>
          <Outlet />
        </MapShell>
      ) : (
        <Outlet />
      )}
    </SiteLayout>
  )
}
